import { APP } from "@shared/lib/routes";
import { NextRequest, NextResponse } from "next/server";

const REFRESH_COOKIE_NAME = "refreshToken";

/**
 * UX gate only — checks whether the httpOnly refresh cookie exists, nothing more. Proxy
 * (formerly "middleware") runs on the edge, before any client JS: it never sees the
 * in-memory access token, and decoding/verifying the refresh JWT here would mean duplicating
 * the API's own auth logic. Real authorization (valid signature, role) is enforced
 * server-side by the API's @Auth() guard on every request — this only stops an
 * obviously-logged-out visitor from momentarily seeing an admin page before the API call
 * would have rejected them anyway.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(REFRESH_COOKIE_NAME);

  if (!hasSession) {
    return NextResponse.redirect(new URL(APP.LOGIN, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Scoped to the admin area only — discover/search/title pages are public browsing and
  // must never be caught here (that's what caused the redirect loop to /login).
  //
  // Must be a static string literal, not `${ADMIN.ROOT}/...` — Next.js extracts `matcher`
  // via static analysis at build time, without evaluating the module, so an interpolated
  // value from an import silently fails to resolve and the matcher ends up matching every
  // route instead of none. Keep this in sync with ADMIN.ROOT ("/admin") by hand.
  matcher: ["/admin/:path*"],
};
