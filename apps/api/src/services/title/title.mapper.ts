import { BASE_LOCALE, Locale } from "../../common/locale.const";
import { localize, translationFor } from "../../common/utils/localize.util";
import { toExternalRatingView } from "../external-ratings/external-ratings.mapper";
import { toGenreView } from "../genre/genre.mapper";
import { emptyTitleEngagementView } from "./title-engagement.mapper";
import { TitleEngagementView } from "./title-engagement.types";
import { TitleView, TitleWithCatalogueRelations } from "./title.types";

export const toTitleView = <V>(
  title: TitleWithCatalogueRelations,
  engagement: TitleEngagementView<V>,
  posterUrl: string | null,
  locale: Locale,
): TitleView<V> => {
  const translation = translationFor(title.translations, locale);
  const { fields, content } = localize(
    { name: title.name, description: title.description },
    translation && { name: translation.name, description: translation.description },
    locale,
  );

  return {
    id: title.id,
    createdAt: title.createdAt,
    updatedAt: title.updatedAt,
    name: fields.name,
    description: fields.description,
    type: title.type,
    posterUrl,
    ageRating: title.ageRating,
    country: title.country,
    releaseDate: title.releaseDate,
    language: title.language,
    trailerUrl: title.trailerUrl,
    runtime: title.runtime,
    network: title.network,
    director: title.director,
    closedCaption: title.closedCaption,
    genres: title.genres.map((genre) => toGenreView(genre, locale)),
    transcodingStatus: title.transcodingStatus,
    engagement,
    externalRatings: (title.externalRatings ?? []).map(toExternalRatingView),
    content,
  };
};

export const titleViewWithoutEngagement = (title: TitleWithCatalogueRelations): TitleView =>
  toTitleView(
    title,
    emptyTitleEngagementView({ score: null, reaction: null, inWatchlist: false }),
    null,
    BASE_LOCALE,
  );
