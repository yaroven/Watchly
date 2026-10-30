import {
  AgeRating,
  ExternalRatings,
  Genre,
  Title,
  TitleType,
  TranscodingStatus,
} from "@prisma/client";
import { ExternalRatingView } from "../external-ratings/external-ratings.types";
import { GenreView } from "../genre/genre.types";
import { TitleEngagementView } from "../title-engagement/title-engagement.types";

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

export interface TitleUpdate extends TitleInput {
  posterUploaded?: boolean;
}

export type TitleWithCatalogueRelations = Title & {
  genres: Genre[];
  externalRatings?: ExternalRatings[];
};

export interface TitleView {
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
  engagement: TitleEngagementView;
  externalRatings: ExternalRatingView[];
}
