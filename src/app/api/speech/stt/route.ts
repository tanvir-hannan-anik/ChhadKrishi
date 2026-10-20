import { errorResponse } from "@/lib/ai/errors";
import { takeAiQuota } from "@/lib/ai/rate-limit";
import { getServerSession } from "@/lib/auth/session";
import { isSpeechToTextConfigured, SpeechProviderError, STT_AUDIO_TYPES, transcribe } from "@/lib/speech/providers";

/** About a minute of Opus speech from MediaRecorder, with headroom. */
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

/** Transcribes a short voice message (Bangla or English, auto-detected) for the chat box. */
export async function POST(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session) return errorResponse("UNAUTHORIZED", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("INVALID_REQUEST", 400);
  }
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return errorResponse("INVALID_REQUEST", 400);
  if (audio.size > MAX_AUDIO_BYTES) return errorResponse("TEXT_TOO_LONG", 413);
  // "audio/webm;codecs=opus" → "audio/webm"
  const mediaType = audio.type.split(";")[0];
  if (!STT_AUDIO_TYPES.includes(mediaType)) return errorResponse("INVALID_REQUEST", 400);

  if (!isSpeechToTextConfigured()) return errorResponse("AI_NOT_CONFIGURED", 503);
  if (!takeAiQuota("speechToText", session.user.id)) return errorResponse("USER_RATE_LIMITED", 429);

  try {
    const { text, lang } = await transcribe(audio, mediaType, request.signal);
    return Response.json({ text: text.normalize("NFC").slice(0, 4000), lang });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    const status = error instanceof SpeechProviderError ? error.status : undefined;
    console.error(`[speech:stt] failed (${status ?? (error as { name?: string })?.name ?? "unknown"})`);
    if (status === 429) return errorResponse("AI_RATE_LIMITED", 503);
    if (status === 400) return errorResponse("INVALID_REQUEST", 400);
    return errorResponse("AI_UNAVAILABLE", 503);
  }
}
