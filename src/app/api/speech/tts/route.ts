import { z } from "zod";
import { errorResponse } from "@/lib/ai/errors";
import { takeAiQuota } from "@/lib/ai/rate-limit";
import { getServerSession } from "@/lib/auth/session";
import { MlServiceError } from "@/lib/ml/service";
import { isTextToSpeechConfigured, SpeechProviderError, synthesize } from "@/lib/speech/providers";

const bodySchema = z.object({
  text: z.string().trim().min(1).max(3000),
  lang: z.enum(["bn", "en"]).default("bn"),
});

/** Reads a chat answer aloud with a Microsoft neural voice (bn-BD / en-IN). Streams MP3. */
export async function POST(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session) return errorResponse("UNAUTHORIZED", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("INVALID_REQUEST", 400);

  if (!isTextToSpeechConfigured()) return errorResponse("AI_NOT_CONFIGURED", 503);
  if (!takeAiQuota("textToSpeech", session.user.id)) return errorResponse("USER_RATE_LIMITED", 429);

  try {
    const audio = await synthesize(parsed.data.text, parsed.data.lang, request.signal);
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    const status = error instanceof SpeechProviderError || error instanceof MlServiceError ? error.status : (error as { name?: string })?.name;
    console.error(`[speech:tts] failed (${status ?? "unknown"})`);
    return errorResponse("AI_UNAVAILABLE", 503);
  }
}
