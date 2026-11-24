import type { CardTitleEngagement, TitleEngagement } from "@/features/title-engagement";
import TranscodingStatus from "@/types/transcoding-status";
import type { ContentLocaleInfo, ContentTranslation, TranslationLocale } from "@shared/lib/content-locale";
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
  content: ContentLocaleInfo;
}

export interface CastCreditArtist {
  id: string;
  name: string;
  photoUrl?: string | null;
}

export type CharacterTranslations = Partial<Record<TranslationLocale, string>>;

export interface CastCredit {
  id: string;
  character?: string | null;
  characterTranslations: CharacterTranslations;
  order: number;
  artist: CastCreditArtist;
  content: ContentLocaleInfo;
}

export interface CastCreditInput {
  artistId: string;
  character?: string;
  characterTranslations?: CharacterTranslations;
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
  content: ContentLocaleInfo;
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

export const TITLE_CONTENT_LIMITS = { name: 255, description: 2000, trailerUrl: 2048 } as const;

const PosterFileSchema = z.custom<FileList | undefined>((value) => value === undefined || value instanceof FileList).optional();

type SchemaTranslator = (key: string) => string;

export const createBaseTitleSchema = (t: SchemaTranslator) =>
  z.object({
    name: z.string().trim().min(1, t("nameRequired")).max(TITLE_CONTENT_LIMITS.name, t("nameTooLong")),
    description: z.string().max(TITLE_CONTENT_LIMITS.description, t("descriptionTooLong")),
    type: z.enum(TitleType),
    ageRating: z.enum(AgeRating, { error: t("ageRatingRequired") }),
    country: z.string().min(1, t("countryRequired")).max(100),
    releaseDate: z.iso.date({ error: t("releaseDateRequired") }),
    language: z.string().min(1, t("languageRequired")).max(100),
    trailerUrl: z.url({ error: t("trailerUrlInvalid") }).max(TITLE_CONTENT_LIMITS.trailerUrl, t("trailerUrlInvalid")),
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
  createBaseTitleSchema(t)
    .extend({
      videoFile: z.custom<FileList>().optional(),
      posterFile: PosterFileSchema,
    })
    .refine((data) => !data.posterFile?.[0] || data.posterFile[0].type.startsWith("image/"), {
      message: t("posterImageOnly"),
      path: ["posterFile"],
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

export interface TitleTranslationInput {
  name: string;
  description: string;
}

export type TitleTranslation = ContentTranslation<TitleTranslationInput>;

export const TITLE_TRANSLATION_LIMITS = { name: TITLE_CONTENT_LIMITS.name, description: TITLE_CONTENT_LIMITS.description } as const;
