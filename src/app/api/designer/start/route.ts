import { IMAGE_LIMITS } from "@/lib/ai/analysis-schema";
import { isAiConfigured } from "@/lib/ai/config";
import { errorResponse } from "@/lib/ai/errors";
import { checkImageBytes } from "@/lib/ai/image-validation";
import { takeAiQuota } from "@/lib/ai/rate-limit";
import { getServerSession } from "@/lib/auth/session";
import { aiFailure } from "@/lib/designer/http";
import { startConsultation } from "@/lib/designer/service";

/** Reads the gardener's space photo and opens the design consultation. The photo is not stored. */
export async function POST(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session) return errorResponse("UNAUTHORIZED", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("INVALID_REQUEST", 400);
  }
  const image = form.get("image");
  const lang = form.get("lang") === "en" ? "en" : "bn";
  if (!(image instanceof File)) return errorResponse("INVALID_IMAGE", 400);
  if (image.size > IMAGE_LIMITS.maxUploadBytes) return errorResponse("IMAGE_TOO_LARGE", 413);
  const check = checkImageBytes(new Uint8Array(await image.arrayBuffer()));
  if (!check.ok) return errorResponse(check.code, check.code === "IMAGE_TOO_LARGE" ? 413 : 400);

  if (!isAiConfigured()) return errorResponse("AI_NOT_CONFIGURED", 503);
  if (!takeAiQuota("designerTurn", session.user.id)) return errorResponse("USER_RATE_LIMITED", 429);

  try {
    const result = await startConsultation({ image: check.bytes, mediaType: check.mediaType, lang, abortSignal: request.signal });
    return Response.json(result);
  } catch (error) {
    return aiFailure("designer:start", error, request);
  }
}
