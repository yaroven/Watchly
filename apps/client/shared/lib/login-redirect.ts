import { routing } from "@/i18n/routing";
import { APP } from "./routes";

const RETURN_PARAM = "next";

export function stripLocale(pathname: string): { locale: string; path: string } {
  const [, first, ...rest] = pathname.split("/");
  const locale = routing.locales.find((candidate) => candidate === first);
  if (!locale) return { locale: routing.defaultLocale, path: pathname || "/" };
  return { locale, path: `/${rest.join("/")}` };
}

export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  const { path } = stripLocale(value);
  if (path === APP.LOGIN || path.startsWith(`${APP.LOGIN}?`) || path === APP.REGISTER) return null;
  return path;
}

export function loginPath(returnTo?: string | null): string {
  const target = safeReturnPath(returnTo);
  return target && target !== "/" ? `${APP.LOGIN}?${RETURN_PARAM}=${encodeURIComponent(target)}` : APP.LOGIN;
}

export function localizedLoginUrl(currentPathWithSearch: string): string {
  const { locale } = stripLocale(currentPathWithSearch.split("?")[0]);
  return `/${locale}${loginPath(currentPathWithSearch)}`;
}

export const LOGIN_RETURN_PARAM = RETURN_PARAM;
