import { Locale } from "../../common/locale.const";
import { localize, translationFor } from "../../common/utils/localize.util";
import { EpisodeView, EpisodeWithTranslations } from "./episode.types";

export const toEpisodeView = (episode: EpisodeWithTranslations, locale: Locale): EpisodeView => {
  const translation = translationFor(episode.translations, locale);
  const { fields, content } = localize(
    { name: episode.name, description: episode.description },
    translation && { name: translation.name, description: translation.description },
    locale,
  );

  return {
    id: episode.id,
    createdAt: episode.createdAt,
    updatedAt: episode.updatedAt,
    number: episode.number,
    name: fields.name,
    description: fields.description,
    seasonId: episode.seasonId,
    transcodingStatus: episode.transcodingStatus,
    content,
  };
};
