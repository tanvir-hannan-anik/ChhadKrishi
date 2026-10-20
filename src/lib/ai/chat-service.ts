import "server-only";

import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, streamText, toUIMessageStream, type UIMessage } from "ai";
import { getModel } from "./config";
import { classifyAiError } from "./errors";
import { chatSystemPrompt } from "./prompts";
import { findChatResources } from "./resources";
import { passageSources, passagesPrompt, retrieveBookPassages } from "@/lib/rag/retrieve";
import type { ChatUIMessage } from "@/lib/chat/resources";
import type { Lang } from "@/lib/i18n/dictionary";

const HISTORY_LIMIT = 30;

/**
 * Only the newest user photo is sent to the model; earlier photos are replaced by a short
 * note. This keeps follow-up turns fast and cheap while the stored history keeps the image.
 */
function prepareHistory(history: UIMessage[]): UIMessage[] {
  const recent = history.slice(-HISTORY_LIMIT);
  const lastUserIndex = recent.findLastIndex((m) => m.role === "user");
  return recent.map((message, index) => {
    if (index === lastUserIndex) return message;
    if (!message.parts.some((part) => part.type === "file")) return message;
    return {
      ...message,
      parts: message.parts.map((part) => (part.type === "file" ? { type: "text" as const, text: "[earlier plant photo]" } : part)),
    };
  });
}

export async function streamChatReply(input: {
  history: UIMessage[];
  lang: Lang;
  /** Extra system context, e.g. the gardener's saved plants. */
  context?: string;
  abortSignal?: AbortSignal;
  onComplete: (assistantMessage: UIMessage) => Promise<void>;
}): Promise<Response> {
  const lastUser = input.history.findLast((m) => m.role === "user");
  const question = lastUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n").trim() ?? "";
  // RAG: passages from the reference books that match the question (none if not configured).
  const passages = await retrieveBookPassages(question, input.abortSignal);

  const result = streamText({
    model: await getModel("chat"),
    system: chatSystemPrompt(input.lang) + (input.context ?? "") + passagesPrompt(passages),
    messages: await convertToModelMessages(prepareHistory(input.history)),
    maxOutputTokens: 1800,
    abortSignal: input.abortSignal,
  });

  const stream = createUIMessageStream<ChatUIMessage>({
    originalMessages: input.history as ChatUIMessage[],
    generateId: () => crypto.randomUUID(),
    // Send a stable code instead of the provider's message.
    onError: (error) => classifyAiError(error),
    execute: async ({ writer }) => {
      // 1) The answer itself always comes first.
      writer.merge(toUIMessageStream({ stream: result.stream, sendFinish: false, onError: (error) => classifyAiError(error) }));
      let answer: string;
      try {
        answer = await result.text;
      } catch {
        return; // The merged stream has already reported the error.
      }
      if (input.abortSignal?.aborted || !answer.trim()) return;

      // 2) Then, only when they genuinely help, videos and shop items below it.
      writer.write({ type: "data-resources", id: "resources", data: { status: "loading", videos: [], products: [] } });
      const resources = await findChatResources({ question, answer, lang: input.lang, abortSignal: input.abortSignal });
      // Only the books the answer actually cited ([1], [2]…) are listed as sources.
      const cited = new Set([...answer.matchAll(/\[(\d)\]/g)].map((m) => Number(m[1]) - 1));
      const sources = passageSources(passages).filter((_, index) => cited.has(index));
      writer.write({ type: "data-resources", id: "resources", data: { ...resources, sources } });
      writer.write({ type: "finish", finishReason: await result.finishReason });
    },
    onEnd: async ({ responseMessage }) => {
      // Persist any reply that produced text — including one the user stopped part-way.
      const hasText = responseMessage.parts.some((part) => part.type === "text" && part.text.trim());
      if (hasText) await input.onComplete(responseMessage as UIMessage);
    },
  });

  return createUIMessageStreamResponse({ stream });
}
