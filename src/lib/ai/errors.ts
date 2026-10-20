/**
 * Stable error codes shared by the AI routes and the UI. Provider messages are never sent to
 * the browser (they can contain request details); the UI maps these codes to Bangla/English.
 */
export const AI_ERROR_CODES = [
  "UNAUTHORIZED",
  "AI_NOT_CONFIGURED",
  "AI_AUTH_FAILED",
  "AI_RATE_LIMITED",
  "USER_RATE_LIMITED",
  "AI_UNAVAILABLE",
  "AI_BAD_OUTPUT",
  "INVALID_REQUEST",
  "INVALID_IMAGE",
  "IMAGE_TOO_LARGE",
  "TEXT_TOO_LONG",
  "NOT_FOUND",
  "AI_FAILED",
] as const;

export type AiErrorCode = (typeof AI_ERROR_CODES)[number];

export function isAiErrorCode(value: unknown): value is AiErrorCode {
  return typeof value === "string" && (AI_ERROR_CODES as readonly string[]).includes(value);
}

/** Maps SDK / gateway / provider errors to a code. Server-side only in practice. */
export function classifyAiError(error: unknown): AiErrorCode {
  const e = error as { name?: string; statusCode?: number; cause?: unknown; lastError?: unknown } | null;
  const name = e?.name ?? "";
  const status = e?.statusCode;

  // After retries, the last provider error says what actually happened (e.g. a daily quota).
  if (name === "AI_RetryError" && e?.lastError && e.lastError !== error) {
    const inner = classifyAiError(e.lastError);
    if (inner !== "AI_FAILED") return inner;
  }

  if (name === "GatewayAuthenticationError" || status === 401 || status === 403) return "AI_AUTH_FAILED";
  if (name === "GatewayRateLimitError" || status === 429) return "AI_RATE_LIMITED";
  if (name === "AI_NoObjectGeneratedError" || name === "AI_NoImageGeneratedError" || name === "AI_NoOutputGeneratedError" || name === "AI_TypeValidationError") return "AI_BAD_OUTPUT";
  if (name === "GatewayModelNotFoundError" || name === "GatewayInvalidRequestError") return "AI_NOT_CONFIGURED";
  if (name === "TimeoutError") return "AI_UNAVAILABLE";
  if ((status !== undefined && status >= 500) || name === "GatewayInternalServerError" || name === "AI_RetryError") return "AI_UNAVAILABLE";
  if (e?.cause && e.cause !== error) return classifyAiError(e.cause);
  return "AI_FAILED";
}

export function errorResponse(code: AiErrorCode, status: number) {
  return Response.json({ error: code }, { status });
}

/** Server-side log for AI failures. Raw model output is logged only in development. */
export function logAiError(scope: string, error: unknown) {
  const e = error as
    | { name?: string; message?: string; text?: string; cause?: { message?: string }; lastError?: { message?: string; responseBody?: string } }
    | null;
  console.error(`[${scope}] failed: ${classifyAiError(error)} (${e?.name ?? "unknown"})`);
  if (process.env.NODE_ENV !== "production") {
    if (e?.cause?.message) console.error(`[${scope}] cause: ${e.cause.message.slice(0, 600)}`);
    // Retry errors wrap the provider's actual response.
    if (e?.lastError) console.error(`[${scope}] last error: ${(e.lastError.responseBody || e.lastError.message || "").slice(0, 600)}`);
    if (e?.text) console.error(`[${scope}] model text: ${e.text.slice(0, 600)}`);
  }
}
