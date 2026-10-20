import "server-only";

import { z } from "zod";
import { classifyAiError, errorResponse, logAiError } from "@/lib/ai/errors";
import { SPACE_TYPES, SUNLIGHT, requirementsSchema, spaceAnalysisSchema } from "./schema";

const STATUS_FOR = { AI_AUTH_FAILED: 502, AI_RATE_LIMITED: 503, AI_UNAVAILABLE: 503, AI_BAD_OUTPUT: 502, AI_NOT_CONFIGURED: 503 } as const;

/** Maps a failed AI call to our stable error response; provider details stay in the server log. */
export function aiFailure(scope: string, error: unknown, request: Request): Response {
  if (request.signal.aborted) return new Response(null, { status: 499 });
  const code = classifyAiError(error);
  logAiError(scope, error);
  return errorResponse(code, code in STATUS_FOR ? STATUS_FOR[code as keyof typeof STATUS_FOR] : 500);
}

export const langSchema = z.enum(["bn", "en"]).catch("bn");

/** Client-held state is re-validated with explicit bounds before it reaches a prompt. */
const shortText = (max: number) => z.string().max(max);

export const clientSpaceSchema = spaceAnalysisSchema.extend({
  spaceType: z.enum(SPACE_TYPES).nullable(),
  lightGuess: z.enum(SUNLIGHT).nullable(),
  summary: shortText(600),
  estimatedAreaSqft: z.number().min(0).max(20_000).nullable(),
  features: z.array(shortText(120)).max(8),
  constraints: z.array(shortText(160)).max(6),
});

export const clientRequirementsSchema = requirementsSchema.extend({
  areaSqft: z.number().min(0).max(20_000).nullable(),
  budgetBdt: z.number().min(0).max(10_000_000).nullable(),
  potCount: z.number().min(0).max(500).nullable(),
  style: shortText(120).nullable(),
  preferredPlants: z.array(shortText(60)).max(12),
  notes: z.array(shortText(200)).max(8),
});
