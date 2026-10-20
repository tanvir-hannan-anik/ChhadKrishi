import "server-only";

import { headers } from "next/headers";
import { auth, ensureAuthReady, type Session } from "./server";

/** Reads and validates the session against the database (not just the cookie). */
export async function getServerSession(requestHeaders?: Headers): Promise<Session | null> {
  // Read request headers first: this marks the route as dynamic before any database work.
  const source = requestHeaders ?? (await headers());
  await ensureAuthReady();
  return auth.api.getSession({ headers: source });
}

/**
 * Authoritative guard for protected pages. Rather than redirecting (the client router can
 * cache a redirect and replay it after login), callers render <AuthRequired /> in place when
 * `session` is null; signing in then refreshes the same page with the photo/draft intact.
 */
export async function getPageSession(): Promise<{ session: Session | null; expired: boolean }> {
  const requestHeaders = await headers();
  const session = await getServerSession(requestHeaders);
  // A session cookie that no longer validates means the session expired or was revoked.
  const expired = !session && (requestHeaders.get("cookie")?.includes("session_token") ?? false);
  return { session, expired };
}
