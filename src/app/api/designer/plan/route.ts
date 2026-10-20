import { z } from "zod";
import { isAiConfigured } from "@/lib/ai/config";
import { errorResponse } from "@/lib/ai/errors";
import { takeAiQuota } from "@/lib/ai/rate-limit";
import { getServerSession } from "@/lib/auth/session";
import { aiFailure, clientRequirementsSchema, clientSpaceSchema, langSchema } from "@/lib/designer/http";
import { missingFields } from "@/lib/designer/schema";
import { createDesignPlan, signPrompt } from "@/lib/designer/service";

const bodySchema = z.object({ lang: langSchema, space: clientSpaceSchema, requirements: clientRequirementsSchema });

/**
 * Turns confirmed requirements into a design plan. The plan's image instructions come back
 * signed for this user; /api/designer/render only accepts signed instructions.
 */
export async function POST(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session) return errorResponse("UNAUTHORIZED", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success || missingFields(parsed.data.requirements).length > 0) return errorResponse("INVALID_REQUEST", 400);
  if (!isAiConfigured()) return errorResponse("AI_NOT_CONFIGURED", 503);
  if (!takeAiQuota("designerPlan", session.user.id)) return errorResponse("USER_RATE_LIMITED", 429);

  try {
    const plan = await createDesignPlan({ ...parsed.data, abortSignal: request.signal });
    return Response.json({ plan, signature: signPrompt(session.user.id, plan.imagePrompt) });
  } catch (error) {
    return aiFailure("designer:plan", error, request);
  }
}
