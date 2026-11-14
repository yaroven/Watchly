import { FALLBACK_TIME_ZONE, isValidTimeZone, TIME_ZONE_COOKIE } from "@shared/lib/time-zone";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const paramValue = await rootParams.locale();
    if (hasLocale(routing.locales, paramValue)) {
      locale = paramValue;
    } else {
      notFound();
    }
  }

  const cookieTimeZone = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  const timeZone = isValidTimeZone(cookieTimeZone) ? cookieTimeZone : FALLBACK_TIME_ZONE;

  return {
    locale,
    timeZone,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
