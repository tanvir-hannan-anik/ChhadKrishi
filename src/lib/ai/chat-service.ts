import "server-only";

import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, streamText, toUIMessageStream, type UIMessage } from "ai";
import { getModel } from "./config";
import { describePhoto, describesPhotos, photoNote } from "./photo-description";
import { classifyAiError } from "./errors";
import { chatSystemPrompt } from "./prompts";
import { findChatResources } from "./resources";
import { abstentionText, isGrounded, isKbConfigured, kbAnswer, kbDiagnose, kbMode, kbSources, type KbResult } from "@/lib/rag/kb";
import { passageSources, passagesPrompt, retrieveBookPassages } from "@/lib/rag/retrieve";
import type { ChatUIMessage } from "@/lib/chat/resources";
import type { Lang } from "@/lib/i18n/dictionary";

const HISTORY_LIMIT = 30;

const UNVERIFIED_NOTE = `

The Encyclopedia of Agriculture and Food Systems (the verified reference library) has no evidence for this question. Start your reply with one short sentence saying this is general guidance that is not verified against the reference book, in the reply's language. Do not give specific doses, rates or chemical products; suggest confirming them with a local agriculture office (e.g. DAE) or the product label.`;

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

function messageText(message: UIMessage): string {
  return message.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n").trim();
}

/**
 * Asks the Agriculture Encyclopedia knowledge graph (rag-service) first. A photo goes through its
 * vision → evidence pipeline; text through intent routing → retrieval → verification. Returns
 * null when the service is not configured, unavailable, or the message is not an agriculture
 * question (small talk), so the general assistant answers as before.
 */
async function consultKnowledgeBase(input: { history: UIMessage[]; question: string; lang: Lang; context?: string; abortSignal?: AbortSignal }): Promise<KbResult | null> {
  if (!isKbConfigured()) return null;
  const lastUser = input.history.findLast((m) => m.role === "user");
  const photo = lastUser?.parts.find((part) => part.type === "file");
  const result = photo
    ? await kbDiagnose(
        {
          image: Buffer.from(photo.url.slice(photo.url.indexOf(",") + 1), "base64"),
          mediaType: photo.mediaType,
          note: input.question,
          lang: input.lang,
          context: input.context,
        },
        input.abortSignal,
      )
    : await kbAnswer(
        {
          question: input.question,
          lang: input.lang,
          history: input.history
            .slice(0, -1)
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role as "user" | "assistant", text: messageText(m) }))
            .filter((t) => t.text),
          context: input.context,
        },
        input.abortSignal,
      );
  return result && result.status !== "not_applicable" ? result : null;
}

/** Writes a finished, already-verified answer into the chat stream (no model call). */
function verifiedReply(input: {
  history: UIMessage[];
  text: string;
  question: string;
  lang: Lang;
  sources: ReturnType<typeof kbSources>;
  abortSignal?: AbortSignal;
  onComplete: (assistantMessage: UIMessage) => Promise<void>;
}): Response {
  const stream = createUIMessageStream<ChatUIMessage>({
    originalMessages: input.history as ChatUIMessage[],
    generateId: () => crypto.randomUUID(),
    onError: (error) => classifyAiError(error),
    execute: async ({ writer }) => {
      const id = crypto.randomUUID();
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: input.text });
      writer.write({ type: "text-end", id });
      writer.write({ type: "data-resources", id: "resources", data: { status: "loading", videos: [], products: [] } });
      const resources = await findChatResources({ question: input.question, answer: input.text, lang: input.lang, abortSignal: input.abortSignal });
      writer.write({ type: "data-resources", id: "resources", data: { ...resources, sources: input.sources } });
      writer.write({ type: "finish", finishReason: "stop" });
    },
    onEnd: async ({ responseMessage }) => {
      if (responseMessage.parts.some((part) => part.type === "text" && part.text.trim())) await input.onComplete(responseMessage as UIMessage);
    },
  });
  return createUIMessageStreamResponse({ stream });
}

function kbReplyText(kb: KbResult, lang: Lang): string {
  if (!isGrounded(kb)) return abstentionText(kb, lang);
  const parts = [kb.answer.trim()];
  for (const item of kb.items) parts.push(`- **${item.name}**${item.detail ? ` — ${item.detail}` : ""} ${item.citations.map((n) => `[${n}]`).join("")}`);
  if (kb.conflicts.length) {
    parts.push(lang === "bn" ? "\n**সূত্রগুলোর মধ্যে মতভেদ:**" : "\n**Where the sources disagree:**", ...kb.conflicts.map((c) => `- ${c.description} ${c.citations.map((n) => `[${n}]`).join("")}`));
  }
  if (kb.uncertainty.trim()) parts.push(`\n_${lang === "bn" ? "সীমাবদ্ধতা" : "Limits of the evidence"}: ${kb.uncertainty.trim()}_`);
  if (kb.clarifying_questions.length) parts.push(lang === "bn" ? "\n**আরও নির্দিষ্ট উত্তরের জন্য জানান:**" : "\n**For a more specific answer, tell me:**", ...kb.clarifying_questions.map((q) => `- ${q}`));
  return parts.join("\n");
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
  const question = lastUser ? messageText(lastUser) : "";

  // 1) The encyclopedia knowledge graph: a verified, page-cited answer, or an honest "not covered".
  const kb = await consultKnowledgeBase({ history: input.history, question, lang: input.lang, context: input.context, abortSignal: input.abortSignal });
  if (kb && (isGrounded(kb) || kbMode() === "strict")) {
    return verifiedReply({ history: input.history, text: kbReplyText(kb, input.lang), question, lang: input.lang, sources: isGrounded(kb) ? kbSources(kb) : [], abortSignal: input.abortSignal, onComplete: input.onComplete });
  }
  // Assist mode only: the encyclopedia had no evidence, so the general assistant answers, labelled as unverified.
  const unverifiedNote = kb ? UNVERIFIED_NOTE : "";

  // 2) RAG over the FAO manuals: passages that match the question (none if not configured).
  const passages = await retrieveBookPassages(question, input.abortSignal);

  let history = prepareHistory(input.history);
  // Some providers' best text model has no vision: use the vision model when a photo is attached,
  // or (see photo-description) let it describe the photo for the text model.
  const photo = lastUser?.parts.find((part) => part.type === "file");
  let kind: "chat" | "vision" = photo ? "vision" : "chat";
  if (photo && describesPhotos()) {
    try {
      const description = await describePhoto({
        image: Buffer.from(photo.url.slice(photo.url.indexOf(",") + 1), "base64"),
        mediaType: photo.mediaType,
        focus: "plant",
        abortSignal: input.abortSignal,
      });
      const last = history.findLastIndex((m) => m.role === "user");
      history = history.map((m, i) => (i === last ? { ...m, parts: m.parts.map((p) => (p.type === "file" ? { type: "text" as const, text: photoNote(description) } : p)) } : m));
      kind = "chat";
    } catch (error) {
      if (input.abortSignal?.aborted) throw error;
      // Description failed: the vision model answers directly instead.
      console.warn("[chat] photo description failed, answering with the vision model:", (error as Error).name);
    }
  }

  const result = streamText({
    model: await getModel(kind),
    system: chatSystemPrompt(input.lang) + (input.context ?? "") + passagesPrompt(passages) + unverifiedNote,
    messages: await convertToModelMessages(history),
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
      const sources = passageSources(passages)
        .map((source, index) => ({ ...source, n: index + 1 }))
        .filter((_, index) => cited.has(index));
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
