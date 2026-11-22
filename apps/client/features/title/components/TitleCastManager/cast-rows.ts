import type { CastCredit, CastCreditInput, CharacterTranslations } from "@/features/title/schemas/title";
import type { TranslationCoverage, TranslationLocale } from "@shared/lib/content-locale";

export interface CastRow {
  artistId: string;
  name: string;
  photoUrl?: string | null;
  character: string;
  characterTranslations: CharacterTranslations;
}

export const toCastRows = (credits: CastCredit[]): CastRow[] =>
  [...credits]
    .sort((a, b) => a.order - b.order)
    .map((credit) => ({
      artistId: credit.artist.id,
      name: credit.artist.name,
      photoUrl: credit.artist.photoUrl,
      character: credit.character || "",
      characterTranslations: credit.characterTranslations ?? {},
    }));

export const withCharacterTranslation = (row: CastRow, locale: TranslationLocale, value: string): CastRow => ({
  ...row,
  characterTranslations: { ...row.characterTranslations, [locale]: value },
});

export const toCastCreditInputs = (rows: CastRow[]): CastCreditInput[] =>
  rows.map((row, index) => {
    const characterTranslations: CharacterTranslations = {};
    for (const [locale, value] of Object.entries(row.characterTranslations) as [TranslationLocale, string | undefined][]) {
      const trimmed = value?.trim();
      if (trimmed) characterTranslations[locale] = trimmed;
    }

    return {
      artistId: row.artistId,
      character: row.character || undefined,
      characterTranslations,
      order: index,
    };
  });

export const castCoverage = (
  rows: CastRow[],
  locales: readonly TranslationLocale[],
): Partial<Record<TranslationLocale, TranslationCoverage>> => {
  const withCharacter = rows.filter((row) => row.character.trim());
  return Object.fromEntries(
    locales.map((locale) => {
      const translated = withCharacter.filter((row) => row.characterTranslations[locale]?.trim()).length;
      const coverage: TranslationCoverage =
        withCharacter.length === 0 ? "done" : translated === 0 ? "none" : translated === withCharacter.length ? "done" : "partial";
      return [locale, coverage];
    }),
  );
};
