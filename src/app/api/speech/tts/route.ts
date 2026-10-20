import { z } from "zod";
import { errorResponse } from "@/lib/ai/errors";
import { takeAiQuota } from "@/lib/ai/rate-limit";
import { getServerSession } from "@/lib/auth/session";
import { isMlConfigured, mlFetch, MlServiceError } from "@/lib/ml/service";

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

  if (!isMlConfigured()) return errorResponse("AI_NOT_CONFIGURED", 503);
  if (!takeAiQuota("textToSpeech", session.user.id)) return errorResponse("USER_RATE_LIMITED", 429);

  try {
    const response = await mlFetch("/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      signal: request.signal,
    });
    return new Response(response.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error(`[speech:tts] failed (${error instanceof MlServiceError ? error.status : (error as { name?: string })?.name ?? "unknown"})`);
    return errorResponse("AI_UNAVAILABLE", 503);
  }
}
