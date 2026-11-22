import { BASE_LOCALE, Locale } from "../locale.const";

export type ContentLocaleView = { locale: Locale; fallback: boolean };

export type Localized<F> = { fields: F; content: ContentLocaleView };

export function localize<F extends object>(
  base: F,
  translation: F | undefined,
  requested: Locale,
): Localized<F> {
  if (requested !== BASE_LOCALE && translation) {
    return { fields: translation, content: { locale: requested, fallback: false } };
  }
  return { fields: base, content: { locale: BASE_LOCALE, fallback: requested !== BASE_LOCALE } };
}

export function translationFor<T extends { locale: string }>(
  translations: T[] | undefined,
  locale: Locale,
): T | undefined {
  return translations?.find((translation) => translation.locale === locale);
}

export type TranslationsInclude = { translations?: { where: { locale: Locale } } };

export function translationsInclude(locale: Locale): TranslationsInclude {
  return locale === BASE_LOCALE ? {} : { translations: { where: { locale } } };
}

export function translationsQuery(locale: Locale): { include?: TranslationsInclude } {
  return locale === BASE_LOCALE ? {} : { include: translationsInclude(locale) };
}
