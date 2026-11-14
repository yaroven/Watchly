import { routing } from "@/i18n/routing";
import { APP } from "@shared/lib/routes";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const REFRESH_COOKIE_NAME = "refreshToken";

export function authProxy(request: NextRequest) {
  if (request.cookies.has(REFRESH_COOKIE_NAME)) {
    return null;
  }

  const segment = request.nextUrl.pathname.split("/")[1];
  const locale = routing.locales.find((l) => l === segment) ?? routing.defaultLocale;

  return NextResponse.redirect(new URL(`/${locale}${APP.LOGIN}`, request.url));
}
