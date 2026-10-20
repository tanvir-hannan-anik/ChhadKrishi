import { getServerSession } from "@/lib/auth/session";
import { IMAGE_LIMITS } from "@/lib/ai/analysis-schema";
import { isAiConfigured } from "@/lib/ai/config";
import { classifyAiError, errorResponse, logAiError } from "@/lib/ai/errors";
import { checkImageBytes } from "@/lib/ai/image-validation";
import { analyzePlantPhoto } from "@/lib/ai/plant-analysis";
import { gardenContextNote } from "@/lib/ai/prompts";
import { takeAiQuota } from "@/lib/ai/rate-limit";
import { gardenContext } from "@/lib/garden/store";

const STATUS_FOR = { AI_AUTH_FAILED: 502, AI_RATE_LIMITED: 503, AI_UNAVAILABLE: 503, AI_BAD_OUTPUT: 502, AI_NOT_CONFIGURED: 503 } as const;

/** Analyzes one plant photo for a signed-in user. Photos are processed in memory, not stored. */
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
  const note = String(form.get("note") ?? "").trim();
  const lang = form.get("lang") === "en" ? "en" : "bn";
  if (!(image instanceof File)) return errorResponse("INVALID_IMAGE", 400);
  if (image.size > IMAGE_LIMITS.maxUploadBytes) return errorResponse("IMAGE_TOO_LARGE", 413);
  if (note.length > IMAGE_LIMITS.maxNoteLength) return errorResponse("TEXT_TOO_LONG", 400);

  const check = checkImageBytes(new Uint8Array(await image.arrayBuffer()));
  if (!check.ok) return errorResponse(check.code, check.code === "IMAGE_TOO_LARGE" ? 413 : 400);

  if (!isAiConfigured()) return errorResponse("AI_NOT_CONFIGURED", 503);
  if (!takeAiQuota("analyze", session.user.id)) return errorResponse("USER_RATE_LIMITED", 429);

  try {
    const context = gardenContextNote(await gardenContext(session.user.id));
    const analysis = await analyzePlantPhoto({ image: check.bytes, mediaType: check.mediaType, note, lang, context, abortSignal: request.signal });
    return Response.json({ analysis });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    const code = classifyAiError(error);
    logAiError("analyze", error);
    return errorResponse(code, code in STATUS_FOR ? STATUS_FOR[code as keyof typeof STATUS_FOR] : 500);
  }
}
