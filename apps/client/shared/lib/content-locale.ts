import { type Locale, routing } from "@/i18n/routing";

export type ContentLocale = Locale;

export type TranslationLocale = Exclude<ContentLocale, "en">;

export interface ContentLocaleInfo {
  locale: ContentLocale;
  fallback: boolean;
}

export const inLocale = (locale: ContentLocale) => ({ headers: { "Accept-Language": locale } });

export type ContentTranslation<TFields> = TFields & { locale: TranslationLocale };

export const pickTranslation = <T extends { locale: TranslationLocale }>(
  translations: T[] | undefined,
  locale: TranslationLocale,
): T | null => translations?.find((translation) => translation.locale === locale) ?? null;

export const BASE_CONTENT_LOCALE = "en" satisfies ContentLocale;

export const TRANSLATION_LOCALES = routing.locales.filter((locale): locale is TranslationLocale => locale !== BASE_CONTENT_LOCALE);

export type TranslationCoverage = "done" | "partial" | "none";

export function translationCoverage<K extends string>(
  translation: Partial<Record<K, unknown>> | null | undefined,
  fields: readonly K[],
): TranslationCoverage {
  if (!translation) return "none";
  const filled = fields.filter((field) => {
    const value = translation[field];
    return typeof value === "string" ? value.trim().length > 0 : value != null;
  }).length;
  if (filled === 0) return "none";
  return filled === fields.length ? "done" : "partial";
}

export function languageName(code: string, displayLocale: string): string {
  try {
    const name = new Intl.DisplayNames([displayLocale], { type: "language" }).of(code) ?? code;
    return name.charAt(0).toLocaleUpperCase(displayLocale) + name.slice(1);
  } catch {
    return code.toUpperCase();
  }
}

export function coverageByLocale<K extends string>(
  translations: (Partial<Record<K, unknown>> & { locale: TranslationLocale })[] | undefined,
  fields: readonly K[],
  locales: readonly TranslationLocale[] = TRANSLATION_LOCALES,
): Partial<Record<TranslationLocale, TranslationCoverage>> {
  if (!translations) return {};
  return Object.fromEntries(locales.map((locale) => [locale, translationCoverage(pickTranslation(translations, locale), fields)]));
}
