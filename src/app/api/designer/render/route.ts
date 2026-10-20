import { IMAGE_LIMITS } from "@/lib/ai/analysis-schema";
import { isImageConfigured } from "@/lib/ai/config";
import { errorResponse } from "@/lib/ai/errors";
import { checkImageBytes } from "@/lib/ai/image-validation";
import { takeAiQuota } from "@/lib/ai/rate-limit";
import { getServerSession } from "@/lib/auth/session";
import { aiFailure } from "@/lib/designer/http";
import { DESIGNER_LIMITS, type AspectRatio } from "@/lib/designer/schema";
import { renderDesign, verifyPrompt } from "@/lib/designer/service";

/**
 * Renders the design onto the gardener's own photo with an image-editing model. Returns the
 * image bytes directly (not base64 JSON) to stay well under the hosting response-size limit.
 */
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
  const instructions = String(form.get("prompt") ?? "");
  const signature = String(form.get("signature") ?? "");
  const aspect = String(form.get("aspectRatio") ?? "");
  if (!(image instanceof File)) return errorResponse("INVALID_IMAGE", 400);
  if (image.size > IMAGE_LIMITS.maxUploadBytes) return errorResponse("IMAGE_TOO_LARGE", 413);
  if (!instructions || instructions.length > DESIGNER_LIMITS.maxPromptLength) return errorResponse("INVALID_REQUEST", 400);
  if (!verifyPrompt(session.user.id, instructions, signature)) return errorResponse("INVALID_REQUEST", 400);
  const aspectRatio = (DESIGNER_LIMITS.aspectRatios as readonly string[]).includes(aspect) ? (aspect as AspectRatio) : "4:3";

  const check = checkImageBytes(new Uint8Array(await image.arrayBuffer()));
  if (!check.ok) return errorResponse(check.code, check.code === "IMAGE_TOO_LARGE" ? 413 : 400);

  if (!isImageConfigured()) return errorResponse("AI_NOT_CONFIGURED", 503);
  if (!takeAiQuota("designerRender", session.user.id)) return errorResponse("USER_RATE_LIMITED", 429);

  try {
    const result = await renderDesign({ image: check.bytes, mediaType: check.mediaType, instructions, aspectRatio, abortSignal: request.signal });
    return new Response(Buffer.from(result.data), {
      headers: { "Content-Type": result.mediaType, "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return aiFailure("designer:render", error, request);
  }
}
