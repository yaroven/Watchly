import { localizedLoginUrl } from "@shared/lib/login-redirect";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const REFRESH_COOKIE_NAME = "refreshToken";

export function authProxy(request: NextRequest) {
  if (request.cookies.has(REFRESH_COOKIE_NAME)) {
    return null;
  }

  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(new URL(localizedLoginUrl(`${pathname}${search}`), request.url));
}
