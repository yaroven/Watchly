export const BASE_LOCALE = "en";

export const TRANSLATION_LOCALES = ["uk"] as const;

export const SUPPORTED_LOCALES = [BASE_LOCALE, ...TRANSLATION_LOCALES] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type TranslationLocale = (typeof TRANSLATION_LOCALES)[number];

export const isSupportedLocale = (value: string): value is Locale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(value);

export const isTranslationLocale = (value: string): value is TranslationLocale =>
  (TRANSLATION_LOCALES as readonly string[]).includes(value);
