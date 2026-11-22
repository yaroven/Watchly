import {
  AgeRating,
  ExternalRatings,
  Title,
  TitleTranslation,
  TitleType,
  TranscodingStatus,
} from "@prisma/client";
import { ContentLocaleView } from "../../common/utils/localize.util";
import { ExternalRatingView } from "../external-ratings/external-ratings.types";
import { GenreView, GenreWithTranslations } from "../genre/genre.types";
import {
  CardViewerTitleEngagementView,
  StoredViewerTitleEngagementView,
  TitleEngagementView,
  ViewerTitleEngagementView,
} from "./title-engagement.types";

export interface TitleInput {
  name: string;
  description: string;
  type: TitleType;
  ageRating: AgeRating;
  country: string;
  releaseDate: Date;
  language: string;
  trailerUrl: string;
  runtime: number;
  network: string;
  director: string;
  closedCaption: boolean;
  genreIds?: string[];
}

export type TitleWithCatalogueRelations = Title & {
  genres: GenreWithTranslations[];
  externalRatings?: ExternalRatings[];
  translations?: TitleTranslation[];
};

export interface TitleView<V = ViewerTitleEngagementView> {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  description: string;
  type: TitleType;
  posterUrl: string | null;
  ageRating: AgeRating;
  country: string;
  releaseDate: Date;
  language: string;
  trailerUrl: string;
  runtime: number;
  network: string;
  director: string;
  closedCaption: boolean;
  genres: GenreView[];
  transcodingStatus: TranscodingStatus;
  engagement: TitleEngagementView<V>;
  externalRatings: ExternalRatingView[];
  content: ContentLocaleView;
}

export type StoredTitleView = TitleView<StoredViewerTitleEngagementView>;

export type CardTitleView = TitleView<CardViewerTitleEngagementView>;
