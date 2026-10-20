import { z } from "zod";
import { isAiConfigured } from "@/lib/ai/config";
import { errorResponse } from "@/lib/ai/errors";
import { takeAiQuota } from "@/lib/ai/rate-limit";
import { getServerSession } from "@/lib/auth/session";
import { aiFailure, clientRequirementsSchema, clientSpaceSchema, langSchema } from "@/lib/designer/http";
import { DESIGNER_LIMITS, answerSchema } from "@/lib/designer/schema";
import { continueConsultation } from "@/lib/designer/service";

const bodySchema = z.object({
  lang: langSchema,
  space: clientSpaceSchema,
  requirements: clientRequirementsSchema,
  history: z.array(answerSchema).min(1).max(DESIGNER_LIMITS.maxTurns + 2),
});

/** One consultation step: records the latest answer and returns the next question (or done). */
export async function POST(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session) return errorResponse("UNAUTHORIZED", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return errorResponse("INVALID_REQUEST", 400);
  if (!isAiConfigured()) return errorResponse("AI_NOT_CONFIGURED", 503);
  if (!takeAiQuota("designerTurn", session.user.id)) return errorResponse("USER_RATE_LIMITED", 429);

  try {
    return Response.json(await continueConsultation({ ...parsed.data, abortSignal: request.signal }));
  } catch (error) {
    return aiFailure("designer:turn", error, request);
  }
}
