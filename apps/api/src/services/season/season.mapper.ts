import { Locale } from "../../common/locale.const";
import { localize, translationFor } from "../../common/utils/localize.util";
import { SeasonView, SeasonWithTranslations } from "./season.types";

export const toSeasonView = (
  season: SeasonWithTranslations,
  posterUrl: string | null,
  locale: Locale,
): SeasonView => {
  const translation = translationFor(season.translations, locale);
  const { fields, content } = localize(
    { name: season.name, description: season.description },
    translation && { name: translation.name, description: translation.description },
    locale,
  );

  return {
    id: season.id,
    createdAt: season.createdAt,
    updatedAt: season.updatedAt,
    number: season.number,
    name: fields.name,
    description: fields.description,
    posterUrl,
    titleId: season.titleId,
    content,
  };
};
