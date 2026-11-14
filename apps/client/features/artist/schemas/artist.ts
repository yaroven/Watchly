import type { useTranslations } from "next-intl";
import { z } from "zod";

export interface Artist {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  photoUrl?: string | null;
}

export interface GetAllArtistsDto {
  page?: number;
  limit?: number;
  searchString?: string;
}

export interface CreateArtistDto {
  name: string;
}

export type UpdateArtistDto = CreateArtistDto;

export const createArtistFormSchema = (t: ReturnType<typeof useTranslations<"artist">>) =>
  z.object({
    name: z.string().min(1, t("validation.nameRequired")).max(255),
    photoFile: z.custom<FileList | undefined>((value) => value === undefined || value instanceof FileList).optional(),
  });

export type ArtistFormValues = z.infer<ReturnType<typeof createArtistFormSchema>>;

export interface ArtistFilmographyItem {
  titleId: string;
  name: string;
  posterUrl: string | null;
  character?: string | null;
}
