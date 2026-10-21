import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { buildSignInUrl } from "@/lib/auth/redirect";

/**
 * Fast, optimistic gate: visitors with no session cookie at all are sent straight to the
 * sign-in modal. It does not validate the cookie — each protected page and API route
 * re-checks the session against the database, which is the real authorization boundary.
 */
export function proxy(request: NextRequest) {
  // Only full page loads are redirected. Client-side router fetches (Sec-Fetch-Dest: empty;
  // Next strips its RSC headers before the proxy runs) are left to the page, which renders its
  // sign-in state in place — a redirect could be cached by the client router and replayed.
  const isDocumentRequest = (request.headers.get("sec-fetch-dest") ?? "document") === "document";
  if (getSessionCookie(request) || !isDocumentRequest) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(new URL(buildSignInUrl(pathname + search), request.url));
}

export const config = {
  matcher: ["/chat/:path*", "/shop/:path*", "/analyze/:path*", "/dashboard/:path*", "/garden/:path*", "/care/:path*", "/designer/:path*", "/weather/:path*", "/profile/:path*"],
};
