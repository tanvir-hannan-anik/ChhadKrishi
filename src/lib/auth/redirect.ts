/** Shared by the proxy, server guards and client modal. Safe to import anywhere. */

export const AUTH_QUERY = { mode: "auth", next: "next", reason: "reason" } as const;
export type AuthReason = "expired";

/** Only allow same-origin relative paths, so `next` can never become an open redirect. */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.startsWith("/api/")) return null;
  return value;
}

export function buildSignInUrl(returnTo: string, reason?: AuthReason): string {
  const params = new URLSearchParams({ [AUTH_QUERY.mode]: "signin" });
  const next = safeReturnPath(returnTo);
  if (next) params.set(AUTH_QUERY.next, next);
  if (reason) params.set(AUTH_QUERY.reason, reason);
  return `/?${params.toString()}`;
}
