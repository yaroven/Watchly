import { toExternalRatingView } from "../external-ratings/external-ratings.mapper";
import { toGenreView } from "../genre/genre.mapper";
import { emptyTitleEngagementView } from "../title-engagement/title-engagement.mapper";
import { TitleEngagementView } from "../title-engagement/title-engagement.types";
import { TitleView, TitleWithCatalogueRelations } from "./title.types";

export const toTitleView = (
  title: TitleWithCatalogueRelations,
  engagement: TitleEngagementView,
  posterUrl: string | null = null,
): TitleView => ({
  id: title.id,
  createdAt: title.createdAt,
  updatedAt: title.updatedAt,
  name: title.name,
  description: title.description,
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
  genres: title.genres.map((genre) => toGenreView(genre)),
  transcodingStatus: title.transcodingStatus,
  engagement,
  externalRatings: (title.externalRatings ?? []).map(toExternalRatingView),
});

export const titleViewWithoutEngagement = (title: TitleWithCatalogueRelations): TitleView =>
  toTitleView(title, emptyTitleEngagementView({ score: null, reaction: null, inWatchlist: false }));
