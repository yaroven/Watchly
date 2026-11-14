import type { CardTitleEngagement, TitleEngagement } from "@/features/title-engagement/schemas/title-engagement";
import TranscodingStatus from "@/types/transcoding-status";
import { z } from "zod";

export enum TitleType {
  MOVIE = "MOVIE",
  SERIES = "SERIES",
}

export enum AgeRating {
  AGE_0 = "AGE_0",
  AGE_12 = "AGE_12",
  AGE_16 = "AGE_16",
  AGE_18 = "AGE_18",
}

export enum ExternalRatingSource {
  IMDB = "IMDB",
  ROTTEN_TOMATOES = "ROTTEN_TOMATOES",
  METACRITIC = "METACRITIC",
}

export interface ExternalRating {
  source: ExternalRatingSource;
  rating: number;
  votesCount: number | null;
}

export interface TitleGenre {
  id: string;
  name: string;
}

export interface CastCreditArtist {
  id: string;
  name: string;
  photoUrl?: string | null;
}

export interface CastCredit {
  id: string;
  character?: string | null;
  order: number;
  artist: CastCreditArtist;
}

export interface CastCreditInput {
  artistId: string;
  character?: string;
  order?: number;
}

export interface Title {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  description: string;
  type: TitleType;
  posterUrl: string;
  ageRating: AgeRating;
  country: string;
  releaseDate: string;
  language: string;
  trailerUrl: string;
  runtime: number;
  network: string;
  director: string;
  closedCaption: boolean;
  seasons: string[];
  transcodingStatus: TranscodingStatus;
  externalRatings: ExternalRating[];
  genres: TitleGenre[];
  engagement: TitleEngagement;
}

export interface CardTitle extends Omit<Title, "engagement"> {
  engagement: CardTitleEngagement;
}

export interface GetAllTitlesDto {
  searchString?: string;
  page?: number;
  limit?: number;
  type?: TitleType;
  transcodingStatus?: TranscodingStatus;
  director?: string;
  network?: string;
  genreId?: string;
}

const PosterFileSchema = z.custom<FileList | undefined>((value) => value === undefined || value instanceof FileList).optional();

type SchemaTranslator = (key: string) => string;

export const createBaseTitleSchema = (t: SchemaTranslator) =>
  z.object({
    name: z.string().min(1, t("nameRequired")),
    description: z.string().max(500),
    type: z.enum(TitleType),
    ageRating: z.enum(AgeRating, { error: t("ageRatingRequired") }),
    country: z.string().min(1, t("countryRequired")).max(100),
    releaseDate: z.iso.date({ error: t("releaseDateRequired") }),
    language: z.string().min(1, t("languageRequired")).max(100),
    trailerUrl: z.url({ error: t("trailerUrlInvalid") }),
    runtime: z.number(t("runtimeRequired")).int(t("runtimeWhole")).min(0, t("runtimeMin")),
    network: z.string().min(1, t("networkRequired")).max(100),
    director: z.string().min(1, t("directorRequired")).max(255),
    closedCaption: z.boolean(),
    genreIds: z.array(z.string()),
  });

export const createCreateTitleSchema = (t: SchemaTranslator) =>
  createBaseTitleSchema(t)
    .extend({
      videoFile: z.custom<FileList>().optional(),
      posterFile: PosterFileSchema,
    })
    .refine(
      (data) => {
        if (!data.posterFile?.[0]) {
          return true;
        }

        return data.posterFile[0].type.startsWith("image/");
      },
      {
        message: t("posterImageOnly"),
        path: ["posterFile"],
      },
    )
    .refine(
      (data) => {
        if (data.type === TitleType.MOVIE) {
          return data.videoFile && data.videoFile.length > 0;
        }
        return true;
      },
      {
        message: t("videoRequiredForMovies"),
        path: ["videoFile"],
      },
    )
    .refine(
      (data) => {
        if (data.videoFile && data.videoFile.length > 0) {
          return data.videoFile[0].type.startsWith("video/");
        }
        return true;
      },
      {
        message: t("videoOnly"),
        path: ["videoFile"],
      },
    );

export const createUpdateTitleSchema = (t: SchemaTranslator) =>
  createBaseTitleSchema(t).extend({
    videoFile: z.custom<FileList>().optional(),
    posterFile: PosterFileSchema,
  });

export type TitleFormValues = z.infer<ReturnType<typeof createCreateTitleSchema>>;

export interface CreateTitleDto {
  name: string;
  description: string;
  type: TitleType;
  ageRating: AgeRating;
  country: string;
  releaseDate: string;
  language: string;
  trailerUrl: string;
  runtime: number;
  network: string;
  director: string;
  closedCaption: boolean;
  genreIds?: string[];
}

export interface UpdateTitleDto {
  name: string;
  description: string;
  type: TitleType;
  ageRating: AgeRating;
  country: string;
  releaseDate: string;
  language: string;
  trailerUrl: string;
  runtime: number;
  network: string;
  director: string;
  closedCaption: boolean;
  genreIds?: string[];
}
