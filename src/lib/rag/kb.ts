import "server-only";

import { mlFetchTo, MlServiceError } from "@/lib/ml/service";
import type { AnalysisKnowledge } from "@/lib/ai/analysis-schema";
import type { BookSource } from "@/lib/chat/resources";
import type { Lang } from "@/lib/i18n/dictionary";

/**
 * Client for the knowledge-base service (rag-service/): the Agriculture Encyclopedia RAG with
 * LangGraph routing, evidence verification, conflict detection and citation validation. Called
 * only from the server with a shared token; the browser never sees its URL or token.
 *
 *   RAG_SERVICE_URL     e.g. https://chhadkrishi-kb.onrender.com
 *   RAG_SERVICE_TOKEN   the same long random string the service is started with
 *   CHHADKRISHI_KB_MODE strict (default): when the encyclopedia has no evidence, the analyzer,
 *                       care and designer features say so instead of giving unverified advice.
 *                       assist: they fall back to the general assistant. The chat always falls
 *                       back to the assistant's own knowledge, whatever the mode.
 *
 * Unset = every feature behaves exactly as before the knowledge base existed.
 */
export function isKbConfigured(): boolean {
  return Boolean(process.env.RAG_SERVICE_URL && process.env.RAG_SERVICE_TOKEN);
}

export function kbMode(): "strict" | "assist" {
  return process.env.CHHADKRISHI_KB_MODE === "assist" ? "assist" : "strict";
}

export type KbStatus = "answered" | "partial" | "abstained" | "needs_clarification" | "not_applicable";

export interface KbCitation {
  n: number;
  chunk_id: string;
  document_title: string | null;
  year: number | null;
  article: string;
  authors: string | null;
  heading_path: string;
  /** e.g. "Vol. 1, p. 37 (PDF p. 66)" — the original page in the encyclopedia. */
  page_ref: string;
  pdf_page_start: number;
  pdf_page_end: number;
  doi: string | null;
  quote: string;
}

export interface KbItem {
  name: string;
  source_term: string;
  detail: string;
  citations: number[];
  likelihood: "low" | "medium" | "high" | "";
}

export interface KbResult {
  status: KbStatus;
  intent: string | null;
  language: Lang | null;
  answer: string;
  items: KbItem[];
  citations: KbCitation[];
  conflicts: { description: string; citations: number[] }[];
  clarifying_questions: string[];
  uncertainty: string;
  related: { article: string; heading_path: string; page_ref: string; pdf_page_start: number }[];
  abstain_reason: string | null;
}

/** Calls the service; returns null (and logs) on any failure so callers keep their old behaviour. */
async function call(path: string, init: RequestInit, signal: AbortSignal | undefined, timeoutMs: number): Promise<KbResult | null> {
  if (!isKbConfigured()) return null;
  try {
    const response = await mlFetchTo(process.env.RAG_SERVICE_URL!, process.env.RAG_SERVICE_TOKEN!, path, { ...init, signal, timeoutMs });
    return (await response.json()) as KbResult;
  } catch (error) {
    if (signal?.aborted) throw error;
    const detail = error instanceof MlServiceError ? `HTTP ${error.status}` : ((error as { name?: string })?.name ?? "unknown");
    console.error(`[kb] ${path} unavailable (${detail}); continuing without the knowledge base`);
    return null;
  }
}

export function kbAnswer(
  input: {
    question: string;
    lang: Lang;
    task?: "answer" | "care_plan" | "garden_plan";
    history?: { role: "user" | "assistant"; text: string }[];
    context?: string;
    observations?: Record<string, unknown> | null;
  },
  signal?: AbortSignal,
): Promise<KbResult | null> {
  const body = {
    question: input.question.slice(0, 2000),
    lang: input.lang,
    task: input.task ?? "answer",
    history: (input.history ?? []).slice(-6).map((t) => ({ role: t.role, text: t.text.slice(0, 4000) })),
    context: (input.context ?? "").slice(0, 3000),
    observations: input.observations ?? null,
  };
  return call("/v1/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, signal, 90_000);
}

export function kbDiagnose(
  input: { image: Uint8Array; mediaType: string; note: string; lang: Lang; measurements?: string; context?: string },
  signal?: AbortSignal,
): Promise<KbResult | null> {
  const form = new FormData();
  form.append("image", new Blob([input.image as BlobPart], { type: input.mediaType }), "photo");
  form.append("note", input.note.slice(0, 500));
  form.append("lang", input.lang);
  form.append("measurements", (input.measurements ?? "").slice(0, 2000));
  form.append("context", (input.context ?? "").slice(0, 3000));
  return call("/v1/diagnose", { method: "POST", body: form }, signal, 120_000);
}

/** True when the result carries verified, cited content. */
export function isGrounded(result: KbResult | null): boolean {
  return Boolean(result && (result.status === "answered" || result.status === "partial") && result.citations.length > 0);
}

/** Citations in the shape the chat's sources list already renders. */
export function kbSources(result: KbResult): BookSource[] {
  return result.citations.map((c) => ({
    title: c.article,
    publisher: c.document_title ?? "Encyclopedia of Agriculture and Food Systems",
    year: c.year,
    section: c.heading_path.split(" › ").slice(1).join(" › ") || c.article,
    url: c.doi ? `https://doi.org/${c.doi}` : "",
    page: c.page_ref,
    quote: c.quote,
    n: c.n,
  }));
}

/** A photo diagnosis result in the shape the analyzer UI renders. */
export function toAnalysisKnowledge(result: KbResult): AnalysisKnowledge | null {
  if (result.status === "not_applicable") return null;
  const grounded = isGrounded(result);
  return {
    status: grounded ? (result.status as "answered" | "partial") : result.status === "needs_clarification" ? "needs_clarification" : "abstained",
    answer: grounded ? result.answer : abstentionText({ ...result, clarifying_questions: [] }, result.language ?? "bn"),
    candidates: grounded ? result.items.map((i) => ({ name: i.name, detail: i.detail, likelihood: i.likelihood, citations: i.citations })) : [],
    citations: kbSources(result).map((s) => ({ n: s.n ?? 0, article: s.title, section: s.section, pageRef: s.page ?? "", quote: s.quote ?? "", url: s.url })),
    conflicts: result.conflicts,
    clarifyingQuestions: result.clarifying_questions,
    uncertainty: result.uncertainty,
  };
}

/** Markdown footer listing the cited pages, used where the UI shows plain text. */
export function citationFooter(result: KbResult, lang: Lang): string {
  if (!result.citations.length) return "";
  const head = lang === "bn" ? "সূত্র (Encyclopedia of Agriculture and Food Systems, 2014)" : "Sources (Encyclopedia of Agriculture and Food Systems, 2014)";
  return `\n\n**${head}:**\n${result.citations.map((c) => `[${c.n}] ${c.article} — ${c.page_ref}`).join("\n")}`;
}

/** The text shown when the knowledge base declines to answer: its message plus clarifying questions. */
export function abstentionText(result: KbResult, lang: Lang): string {
  const lines = [result.answer.trim()];
  if (result.clarifying_questions.length) {
    lines.push(lang === "bn" ? "\n**আরও ভালোভাবে সাহায্য করতে জানতে চাই:**" : "\n**To help further, could you tell me:**", ...result.clarifying_questions.map((q) => `- ${q}`));
  }
  if (result.related.length) {
    lines.push(lang === "bn" ? "\n**এনসাইক্লোপিডিয়ার কাছাকাছি অংশ (উত্তর নয়, পড়ার জন্য):**" : "\n**Closest encyclopedia sections (not an answer, for reading):**", ...result.related.map((r) => `- ${r.heading_path} — ${r.page_ref}`));
  }
  return lines.filter(Boolean).join("\n");
}
