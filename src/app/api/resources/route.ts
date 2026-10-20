import { z } from "zod";
import { getServerSession } from "@/lib/auth/session";
import { isAiConfigured } from "@/lib/ai/config";
import { errorResponse } from "@/lib/ai/errors";
import { takeAiQuota } from "@/lib/ai/rate-limit";
import { findChatResources } from "@/lib/ai/resources";

const bodySchema = z.object({
  question: z.string().max(1500),
  answer: z.string().min(1).max(4000),
  lang: z.enum(["bn", "en"]).default("bn"),
});

/** Videos and shop items that support an AI result the gardener already has (e.g. a photo analysis). */
export async function POST(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session) return errorResponse("UNAUTHORIZED", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("INVALID_REQUEST", 400);
  if (!isAiConfigured()) return errorResponse("AI_NOT_CONFIGURED", 503);
  if (!takeAiQuota("resources", session.user.id)) return errorResponse("USER_RATE_LIMITED", 429);

  return Response.json(await findChatResources({ ...parsed.data, diagnosis: true, abortSignal: request.signal }));
}
