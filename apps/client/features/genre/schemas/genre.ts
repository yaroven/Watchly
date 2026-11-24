import type { ContentLocaleInfo, ContentTranslation } from "@shared/lib/content-locale";
export interface Genre {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  titleCount?: number;
  content: ContentLocaleInfo;
}

export interface GetAllGenresDto {
  page?: number;
  limit?: number;
}

export interface CreateGenreDto {
  name: string;
}

export type UpdateGenreDto = CreateGenreDto;

export interface GenreTranslationInput {
  name: string;
}

export type GenreTranslation = ContentTranslation<GenreTranslationInput>;

export const GENRE_TRANSLATION_LIMITS = { name: 100 } as const;
