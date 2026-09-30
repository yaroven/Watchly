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
  /** ISO date string ("YYYY-MM-DD" or full ISO datetime), matches the native date input's format. */
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
  /** Watchly's own score, aggregated from viewer ratings — `average` is null until someone rates it. */
  rating: { average: number | null; count: number };
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

export const BaseTitleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().max(500),
  type: z.enum(TitleType),
  ageRating: z.enum(AgeRating, { error: "Age rating is required" }),
  country: z.string().min(1, "Country is required").max(100),
  releaseDate: z.iso.date({ error: "Release date is required" }),
  language: z.string().min(1, "Language is required").max(100),
  trailerUrl: z.url({ error: "Trailer URL must be a valid URL" }),
  runtime: z.number("Runtime is required").int("Runtime must be a whole number").min(0, "Runtime must be 0 or greater"),
  network: z.string().min(1, "Network is required").max(100),
  director: z.string().min(1, "Director is required").max(255),
  closedCaption: z.boolean(),
  genreIds: z.array(z.string()),
});

export const CreateTitleSchema = BaseTitleSchema.extend({
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
      message: "Only image files are supported for posters",
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
      message: "Video file is required for Movies",
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
      message: "Only video files are supported",
      path: ["videoFile"],
    },
  );

/** Full-object update: every base field is resent, mirroring the backend's UpdateTitleDto. */
export const UpdateTitleSchema = BaseTitleSchema.extend({
  videoFile: z.custom<FileList>().optional(),
  posterFile: PosterFileSchema,
});

export type TitleFormValues = z.infer<typeof CreateTitleSchema>;

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
  posterUrl: string;
  genreIds?: string[];
}
