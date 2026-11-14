import { routing } from "@/i18n/routing";
import { hasLocale } from "next-intl";

export async function resolveRequestLocale(): Promise<string | undefined> {
  if (typeof window !== "undefined") {
    const lang = typeof document !== "undefined" ? document.documentElement.lang : undefined;
    return hasLocale(routing.locales, lang) ? lang : undefined;
  }

  try {
    const { getLocale } = await import("next-intl/server");
    const locale = await getLocale();
    return hasLocale(routing.locales, locale) ? locale : undefined;
  } catch {
    return undefined;
  }
}
