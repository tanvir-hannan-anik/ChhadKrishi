import { isAiErrorCode, type AiErrorCode } from "./errors";

/**
 * Extracts our stable error code from a failed request. Works for useChat errors (HTTP errors
 * carry the JSON body; mid-stream errors carry the code as their message) and fetch responses.
 */
export function aiErrorCodeOf(error: unknown): AiErrorCode {
  const e = error as { statusCode?: number; responseBody?: string; message?: string } | null;
  if (e?.statusCode === 401) return "UNAUTHORIZED";
  for (const candidate of [e?.responseBody, e?.message]) {
    if (!candidate) continue;
    if (isAiErrorCode(candidate)) return candidate;
    try {
      const parsed = JSON.parse(candidate) as { error?: unknown };
      if (isAiErrorCode(parsed.error)) return parsed.error;
    } catch {}
  }
  if (error instanceof TypeError) return "AI_UNAVAILABLE"; // network failure
  return "AI_FAILED";
}
