import { Artist, CastCredit, Prisma } from "@prisma/client";
import { isTranslationLocale, Locale } from "../../common/locale.const";
import { localize } from "../../common/utils/localize.util";
import { toArtistView } from "../artist/artist.mapper";
import { CastCreditView, CharacterTranslations } from "./title-cast.types";

export const readCharacterTranslations = (
  value: Prisma.JsonValue | null,
): CharacterTranslations => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const translations: CharacterTranslations = {};
  for (const [locale, name] of Object.entries(value)) {
    if (isTranslationLocale(locale) && typeof name === "string" && name.length > 0) {
      translations[locale] = name;
    }
  }
  return translations;
};

export const toCastCreditView = (
  credit: CastCredit & { artist: Artist },
  artistPhotoUrl: string | null,
  locale: Locale,
): CastCreditView => {
  const characterTranslations = readCharacterTranslations(credit.characterTranslations);
  const translated = locale === "en" ? undefined : characterTranslations[locale];
  const { fields, content } = localize(
    { character: credit.character },
    translated === undefined ? undefined : { character: translated },
    locale,
  );

  return {
    id: credit.id,
    character: fields.character,
    characterTranslations,
    order: credit.order,
    artist: toArtistView(credit.artist, artistPhotoUrl),
    content,
  };
};
