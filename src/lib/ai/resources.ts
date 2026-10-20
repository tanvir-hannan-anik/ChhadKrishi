import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";
import { getModel } from "./config";
import type { ChatResources } from "@/lib/chat/resources";
import type { Lang } from "@/lib/i18n/dictionary";
import { listProducts, type Product } from "@/lib/shop/store";
import { searchVideos } from "@/lib/youtube";

const PLAN_TIMEOUT_MS = 40_000;
/** Short chat replies are usually clarifying questions or refusals: nothing to recommend. */
const MIN_CHAT_ANSWER_LENGTH = 220;

// Limits are stated in the descriptions and enforced below, not in the schema: providers that
// validate output against the schema (Groq) reject the whole answer over one long field.
const planSchema = z.object({
  videoQuery: z.string().describe("A specific YouTube search query (under 120 characters), or an empty string when a video would not genuinely help."),
  productIds: z.array(z.string()).describe("Up to 3 ids from the shop list for items the answer tells the gardener to use; empty if none."),
});

export const RESOURCE_PLAN_MARKER = "[resource-plan]";

/** How answers name each shop item, in English and Bangla. Unknown ids are simply ignored. */
const PRODUCT_TERMS: Record<string, RegExp> = {
  "fert-vermicompost-5kg": /vermi-?compost|worm compost|ভার্মি\s?কম্পোস্ট|কেঁচো সার/i,
  "fert-neem-cake-1kg": /neem cake|neem khol|নিম খৈল|নিমের খৈল/i,
  "pot-clay-12in": /clay pot|terracotta|মাটির টব/i,
  "pot-grow-bag-5": /grow ?bags?|জিও ব্যাগ|গ্রো ব্যাগ/i,
  "seed-tomato-local": /tomato seeds?|টমেটো(র)? বীজ/i,
  "seed-green-chilli": /chilli seeds?|chili seeds?|মরিচ(ের)? বীজ/i,
};

function mentionedProducts(answer: string, products: Product[]): Product[] {
  return products.filter((p) => PRODUCT_TERMS[p.id]?.test(answer));
}

/** The gardener's own question makes a sensible YouTube search when no planner is available. */
function fallbackVideoQuery(question: string): string {
  const query = question.replace(/\s+/g, " ").replace(/[?？!।]+/g, " ").trim();
  return query.length >= 8 ? query.slice(0, 90) : "";
}

function planPrompt(lang: Lang, catalogue: string): string {
  return `${RESOURCE_PLAN_MARKER} You choose optional extras to show below a plant-care answer from ChhadKrishi, a rooftop gardening assistant in Bangladesh.

Rules:
- videoQuery: give one whenever the answer contains practical steps a gardener could watch being done (a pest or disease treatment, making a spray or compost, sowing, transplanting, pruning, potting, setting up containers or drainage). Make it short and specific to the crop and the action, e.g. "neem oil spray for aphids on chilli plants", written in ${lang === "bn" ? "Bangla" : "English"}. Use "" only when no such step exists.
- productIds: include an item when the answer tells the gardener to use that kind of item (for example vermicompost, neem cake, a clay pot or grow bags, or seeds of that crop). Do not add items the answer does not call for.
- For greetings, clarifying questions, refusals or unrelated topics, return "" and [].

Shop items (id: name):
${catalogue}`;
}

async function withDeadline<T>(ms: number, run: (signal: AbortSignal) => Promise<T>, outer?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const onAbort = () => controller.abort();
  outer?.addEventListener("abort", onAbort);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", onAbort);
  }
}

/**
 * Picks videos and shop items that support an answer the gardener has already received. Any
 * failure simply means no extras: the answer itself is never affected.
 */
export async function findChatResources(input: {
  question: string;
  answer: string;
  lang: Lang;
  /** A photo diagnosis is never a clarifying question, so it skips the length check. */
  diagnosis?: boolean;
  abortSignal?: AbortSignal;
}): Promise<ChatResources> {
  const none: ChatResources = { status: "ready", videos: [], products: [] };
  if (!input.diagnosis && input.answer.trim().length < MIN_CHAT_ANSWER_LENGTH) return none;

  let products: Product[];
  try {
    products = await listProducts();
  } catch {
    return none;
  }
  // Items the answer itself names — reliable even when the planner model is unavailable.
  const mentioned = mentionedProducts(input.answer, products);

  try {
    const catalogue = products.map((p) => `${p.id}: ${p.nameEn} / ${p.nameBn}`).join("\n");
    const { output } = await withDeadline(
      PLAN_TIMEOUT_MS,
      async (abortSignal) =>
        generateText({
          model: await getModel("structured"),
          system: planPrompt(input.lang, catalogue),
          prompt: `Gardener's message:\n${input.question.slice(0, 1500) || "(a plant photo)"}\n\nAnswer they received:\n${input.answer.slice(0, 2500)}`,
          output: Output.object({ name: "chat_resources", schema: planSchema }),
          // Generous: reasoning models spend part of this budget thinking before the JSON.
          maxOutputTokens: 1500,
          abortSignal,
        }),
      input.abortSignal,
    );

    const ids = new Set([...output.productIds, ...mentioned.map((p) => p.id)]);
    const query = output.videoQuery.trim().slice(0, 120);
    return {
      status: "ready",
      // Only real catalogue items, with names and prices from the database, never from the model.
      products: products.filter((p) => ids.has(p.id)).slice(0, 3),
      videos: query ? await searchVideos(query, input.lang) : [],
    };
  } catch (error) {
    if (input.abortSignal?.aborted) return none;
    // Planner unavailable (e.g. a free model's daily limit): fall back to the question itself as
    // the video search and to the items the answer names, so a real answer still gets extras.
    console.warn("[resources] planner unavailable, using fallback:", (error as Error).name);
    const query = fallbackVideoQuery(input.question);
    return { status: "ready", products: mentioned.slice(0, 3), videos: query ? await searchVideos(query, input.lang) : [] };
  }
}
