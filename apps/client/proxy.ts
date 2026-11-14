import { routing } from "@/i18n/routing";
import { authProxy } from "@/proxies/auth.proxy";
import i18nProxy from "@/proxies/i18n.proxy";
import type { NextRequest } from "next/server";

const adminRoute = new RegExp(`^(/(${routing.locales.join("|")}))?/admin(/|$)`);

export function proxy(request: NextRequest) {
  if (adminRoute.test(request.nextUrl.pathname)) {
    const authResponse = authProxy(request);
    if (authResponse) {
      return authResponse;
    }
  }
  return i18nProxy(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|robots\\.txt|sitemap\\.xml|.*\\..*).*)"],
};
