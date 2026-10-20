import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { generateImage, generateText, Output } from "ai";
import { getImageModel, getModel, isFixtureMode } from "@/lib/ai/config";
import type { Lang } from "@/lib/i18n/dictionary";
import { fixturePlan, fixtureSpace } from "./fixtures";
import { consultationSystemPrompt, firstTurnInstruction, planSystemPrompt, planUserPrompt, renderPrompt, turnContext } from "./prompts";
import { fallbackQuestion } from "./questions";
import {
  DESIGNER_LIMITS,
  EMPTY_REQUIREMENTS,
  designPlanSchema,
  firstTurnSchema,
  mergeRequirements,
  missingFields,
  normalizeRequirements,
  normalizeSpace,
  turnSchema,
  type Answer,
  type AspectRatio,
  type DesignPlan,
  type Question,
  type Requirements,
  type SpaceAnalysis,
  type Turn,
} from "./schema";

export interface TurnResult {
  acknowledgement: string;
  requirements: Requirements;
  question: Question | null;
  done: boolean;
  /** True when the server stepped in with a standard question (model skipped one or failed). */
  fallback: boolean;
}

/** Upper bounds per call, so a stalled provider surfaces as a recoverable error, not a hang. */
const TIMEOUTS = { start: 90_000, turn: 45_000, plan: 120_000, render: 180_000 } as const;

/**
 * Runs `task` with a signal that aborts on the request's own signal or after `ms`. Built from a
 * plain controller and timer: an AbortSignal.timeout() combined via AbortSignal.any() can be
 * garbage-collected in Node before it fires, silently disabling the deadline.
 */
async function withDeadline<T>(signal: AbortSignal | undefined, ms: number, task: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Deadline exceeded", "TimeoutError")), ms);
  const forward = () => controller.abort(signal?.reason);
  if (signal?.aborted) forward();
  else signal?.addEventListener("abort", forward, { once: true });
  try {
    return await task(controller.signal);
  } catch (error) {
    // Surface our deadline as a TimeoutError rather than a generic abort.
    if (controller.signal.aborted && !signal?.aborted) throw controller.signal.reason;
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forward);
  }
}

/** Errors that mean "not set up", where falling back would only hide the real problem. */
function isConfigError(error: unknown): boolean {
  const e = error as { name?: string; statusCode?: number } | null;
  return e?.name === "GatewayModelNotFoundError" || e?.name === "GatewayAuthenticationError" || e?.statusCode === 401 || e?.statusCode === 403;
}

const ENUM_FIELDS = new Set(["spaceType", "sunlight", "experience", "maintenance"]);
const NUMBER_FIELDS = new Set(["areaSqft", "budgetBdt", "potCount"]);

/**
 * Applies an option/number answer directly, so structured answers are recorded even if the
 * model misreads them (or is unavailable). Free-text answers are left to the model.
 */
function largestNumber(text: string): number {
  const ascii = text.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6)).replace(/(\d),(?=\d)/g, "$1");
  const numbers = (ascii.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  return numbers.length ? Math.max(...numbers) : NaN;
}

/** Option values must be unique (they key the buttons and identify the choice). */
function uniqueOptions(options: Question["options"]): Question["options"] {
  const seen = new Set<string>();
  return options
    .map((o) => ({ label: o.label.trim(), value: o.value.trim() || o.label.trim() }))
    .map((o) => (seen.has(o.value) ? { ...o, value: o.label } : o))
    .filter((o) => o.label && !seen.has(o.value) && seen.add(o.value))
    .slice(0, 6);
}

export function applyAnswer(requirements: Requirements, answer: Answer): Requirements {
  const { field, value } = answer;
  if (value === undefined) return requirements;
  const next = { ...requirements } as Record<string, unknown>;
  if (ENUM_FIELDS.has(field) && typeof value === "string") next[field] = value;
  else if (NUMBER_FIELDS.has(field)) {
    // "Up to ৳10,000", "6,000 to 10,000 BDT", "৫০০০": the largest number (Bangla digits too).
    const n = typeof value === "number" ? value : largestNumber(String(value));
    if (Number.isFinite(n) && n > 0) next[field] = n;
  } else if (field === "preferredPlants") next.preferredPlants = Array.isArray(value) ? value : [String(value)];
  else if (field === "style" && typeof value === "string") next.style = value;
  else if (field === "notes" && typeof value === "string") next.notes = [...requirements.notes, value];
  else return requirements;
  // Enum values arrive from the client; the merge re-validates shape through normalisation.
  return mergeRequirements(requirements, normalizeRequirements(next as Requirements));
}

/** Decides the next question, stepping in when the model finished too early or asked nothing. */
function settle(turn: Turn, base: Requirements, asked: number, lang: Lang, fallback: boolean): TurnResult {
  const requirements = mergeRequirements(base, normalizeRequirements(turn.requirements));
  const missing = missingFields(requirements);
  const outOfTurns = asked >= DESIGNER_LIMITS.maxTurns;

  if (outOfTurns || (missing.length === 0 && (turn.done || !turn.question))) {
    return { acknowledgement: turn.acknowledgement, requirements, question: null, done: true, fallback };
  }
  if (turn.question && turn.question.text.trim() && !turn.done) {
    const question = { ...turn.question, options: uniqueOptions(turn.question.options) };
    return { acknowledgement: turn.acknowledgement, requirements, question, done: false, fallback };
  }
  return { acknowledgement: turn.acknowledgement, requirements, question: fallbackQuestion(missing[0], lang), done: false, fallback: true };
}

export async function startConsultation(input: {
  image: Uint8Array;
  mediaType: string;
  lang: Lang;
  abortSignal?: AbortSignal;
}): Promise<{ space: SpaceAnalysis } & TurnResult> {
  if (isFixtureMode()) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const space = fixtureSpace(input.lang);
    return { space, ...settle({ acknowledgement: space.summary, requirements: EMPTY_REQUIREMENTS, done: false, question: null }, EMPTY_REQUIREMENTS, 0, input.lang, false) };
  }

  try {
    const model = await getModel("vision");
    const { output } = await withDeadline(input.abortSignal, TIMEOUTS.start, (abortSignal) =>
      generateText({
        model,
        system: consultationSystemPrompt(input.lang),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: firstTurnInstruction(input.lang) },
              { type: "file", mediaType: input.mediaType, data: input.image },
            ],
          },
        ],
        output: Output.object({ name: "garden_consultation_start", schema: firstTurnSchema }),
        abortSignal,
      }),
    );

    const { space, ...turn } = output;
    // Photo guesses are only ever offered as options; the gardener confirms every requirement.
    return { space: normalizeSpace(space), ...settle(turn, EMPTY_REQUIREMENTS, 0, input.lang, false) };
  } catch (error) {
    if (input.abortSignal?.aborted || isConfigError(error)) throw error;
    // The photo could not be analysed (slow or failing model): start with the standard
    // questions rather than blocking the gardener. The photo is still used for the render.
    console.error(`[designer] photo analysis fell back to standard questions (${(error as { name?: string })?.name ?? "unknown"})`);
    const space: SpaceAnalysis = { isGardenSpace: true, spaceType: null, summary: "", estimatedAreaSqft: null, lightGuess: null, features: [], constraints: [] };
    return { space, ...settle({ acknowledgement: "", requirements: EMPTY_REQUIREMENTS, done: false, question: null }, EMPTY_REQUIREMENTS, 0, input.lang, true) };
  }
}

export async function continueConsultation(input: {
  space: SpaceAnalysis;
  requirements: Requirements;
  history: Answer[];
  lang: Lang;
  abortSignal?: AbortSignal;
}): Promise<TurnResult> {
  const last = input.history.at(-1);
  const base = last ? applyAnswer(normalizeRequirements(input.requirements), last) : normalizeRequirements(input.requirements);
  const asked = input.history.length;

  if (isFixtureMode()) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const ack = input.lang === "bn" ? "🧪 পরীক্ষামূলক মডেল — উত্তরটি নোট করলাম।" : "🧪 Test model — noted your answer.";
    return settle({ acknowledgement: ack, requirements: base, done: false, question: null }, base, asked, input.lang, false);
  }

  try {
    const model = await getModel("structured");
    const { output } = await withDeadline(input.abortSignal, TIMEOUTS.turn, (abortSignal) =>
      generateText({
        model,
        system: consultationSystemPrompt(input.lang),
        prompt: turnContext(input.space, base, input.history),
        output: Output.object({ name: "garden_consultation_turn", schema: turnSchema }),
        abortSignal,
      }),
    );
    return settle(output, base, asked, input.lang, false);
  } catch (error) {
    // Keep the consultation alive with the standard questions; structured answers were
    // already applied above. Configuration problems still surface as errors.
    if (input.abortSignal?.aborted || isConfigError(error)) throw error;
    console.error(`[designer] turn fell back to standard questions (${(error as { name?: string })?.name ?? "unknown"})`);
    return settle({ acknowledgement: "", requirements: base, done: false, question: null }, base, asked, input.lang, true);
  }
}

export async function createDesignPlan(input: {
  space: SpaceAnalysis;
  requirements: Requirements;
  lang: Lang;
  abortSignal?: AbortSignal;
}): Promise<DesignPlan> {
  if (isFixtureMode()) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return fixturePlan(input.lang, input.requirements);
  }
  const model = await getModel("structured");
  const { output } = await withDeadline(input.abortSignal, TIMEOUTS.plan, (abortSignal) =>
    generateText({
      model,
      system: planSystemPrompt(input.lang),
      prompt: planUserPrompt(input.space, normalizeRequirements(input.requirements)),
      output: Output.object({ name: "garden_design_plan", schema: designPlanSchema }),
      abortSignal,
    }),
  );
  return { ...output, imagePrompt: output.imagePrompt.trim().slice(0, DESIGNER_LIMITS.maxPromptLength) };
}

/**
 * The render endpoint only accepts edit instructions the plan endpoint produced for the same
 * user, so it can't be used as a general-purpose image generator with our API key.
 */
function signingKey(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required to sign design prompts");
  return secret;
}

export function signPrompt(userId: string, prompt: string): string {
  return createHmac("sha256", signingKey()).update(`garden-design:v1\n${userId}\n${prompt}`).digest("base64url");
}

export function verifyPrompt(userId: string, prompt: string, signature: string): boolean {
  const expected = Buffer.from(signPrompt(userId, prompt));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function renderDesign(input: {
  image: Uint8Array;
  mediaType: string;
  instructions: string;
  aspectRatio: AspectRatio;
  abortSignal?: AbortSignal;
}): Promise<{ data: Uint8Array; mediaType: string }> {
  if (isFixtureMode()) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    if (input.instructions.includes("#fail")) throw Object.assign(new Error("Simulated outage"), { statusCode: 503 });
    return { data: input.image, mediaType: input.mediaType };
  }
  const { image } = await withDeadline(input.abortSignal, TIMEOUTS.render, (abortSignal) =>
    generateImage({
      model: getImageModel(),
      prompt: { text: renderPrompt(input.instructions), images: [input.image] },
      aspectRatio: input.aspectRatio,
      abortSignal,
    }),
  );
  return { data: image.uint8Array, mediaType: image.mediaType };
}
