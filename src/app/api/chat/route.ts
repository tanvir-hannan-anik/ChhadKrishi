import type { UIMessage } from "ai";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/session";
import { streamChatReply } from "@/lib/ai/chat-service";
import { isAiConfigured } from "@/lib/ai/config";
import { errorResponse } from "@/lib/ai/errors";
import { checkImageDataUrl } from "@/lib/ai/image-validation";
import { gardenContextNote } from "@/lib/ai/prompts";
import { takeAiQuota } from "@/lib/ai/rate-limit";
import { gardenContext } from "@/lib/garden/store";
import {
  appendMessage,
  createConversation,
  deleteMessagesFrom,
  deleteTrailingAssistantMessages,
  getConversationOwner,
  loadMessages,
  titleFrom,
} from "@/lib/chat/store";

const MAX_TEXT_LENGTH = 4000;

// The client sends only the new message; history always comes from the database.
const bodySchema = z.object({
  id: z.uuid(),
  trigger: z.enum(["submit-message", "regenerate-message"]),
  lang: z.enum(["bn", "en"]).default("bn"),
  message: z
    .object({
      id: z.string().min(1).max(100),
      role: z.literal("user"),
      parts: z
        .array(
          z.discriminatedUnion("type", [
            z.object({ type: z.literal("text"), text: z.string() }),
            z.object({ type: z.literal("file"), mediaType: z.string(), url: z.string(), filename: z.string().max(200).optional() }),
          ]),
        )
        .min(1)
        .max(4),
    })
    .optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session) return errorResponse("UNAUTHORIZED", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("INVALID_REQUEST", 400);
  const { id: conversationId, trigger, lang, message } = parsed.data;
  const userId = session.user.id;

  const owner = await getConversationOwner(conversationId);
  if (owner && owner !== userId) return errorResponse("NOT_FOUND", 404);

  // 1) Validate input before anything else (and before any database write).
  let userMessage: UIMessage | null = null;
  let firstText = "";
  if (trigger === "submit-message") {
    if (!message) return errorResponse("INVALID_REQUEST", 400);
    // Rebuild the message from validated pieces only.
    firstText = message.parts.filter((p) => p.type === "text").map((p) => p.text).join("\n").trim();
    const files = message.parts.filter((p) => p.type === "file");
    if (firstText.length > MAX_TEXT_LENGTH) return errorResponse("TEXT_TOO_LONG", 400);
    if (files.length > 1) return errorResponse("INVALID_IMAGE", 400);
    if (!firstText && files.length === 0) return errorResponse("INVALID_REQUEST", 400);

    const parts: UIMessage["parts"] = [];
    for (const file of files) {
      const check = checkImageDataUrl(file.url);
      if (!check.ok) return errorResponse(check.code, check.code === "IMAGE_TOO_LARGE" ? 413 : 400);
      parts.push({ type: "file", mediaType: check.mediaType, url: file.url, filename: file.filename });
    }
    if (firstText) parts.push({ type: "text", text: firstText });
    userMessage = { id: message.id, role: "user", parts };
  } else if (!owner) {
    return errorResponse("INVALID_REQUEST", 400);
  }

  // 2) Only then spend AI capacity.
  if (!isAiConfigured()) return errorResponse("AI_NOT_CONFIGURED", 503);
  if (!takeAiQuota("chat", userId)) return errorResponse("USER_RATE_LIMITED", 429);

  // 3) Persist and build the history the model sees.
  let history: UIMessage[] = owner ? ((await loadMessages(userId, conversationId)) ?? []) : [];
  if (!userMessage) {
    if (!history.some((m) => m.role === "user")) return errorResponse("INVALID_REQUEST", 400);
    history = await deleteTrailingAssistantMessages(conversationId, history);
  } else {
    if (!owner) await createConversation(userId, conversationId, titleFrom(firstText, lang === "bn" ? "ছবির প্রশ্ন" : "Photo question"));
    // A retry re-sends the same message id: drop it and anything after it (e.g. a partial reply).
    const existingIndex = history.findIndex((m) => m.id === userMessage.id);
    if (existingIndex >= 0) history = await deleteMessagesFrom(conversationId, history, existingIndex);
    await appendMessage(conversationId, userMessage);
    history = [...history, userMessage];
  }

  return streamChatReply({
    history,
    lang,
    context: gardenContextNote(await gardenContext(userId)),
    abortSignal: request.signal,
    onComplete: (assistantMessage) => appendMessage(conversationId, assistantMessage),
  });
}
