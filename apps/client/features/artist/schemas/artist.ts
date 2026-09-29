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
  photoUrl?: string;
}

export type UpdateArtistDto = CreateArtistDto;

export const ArtistFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  photoFile: z.custom<FileList | undefined>((value) => value === undefined || value instanceof FileList).optional(),
});

export type ArtistFormValues = z.infer<typeof ArtistFormSchema>;

export interface ArtistFilmographyItem {
  titleId: string;
  name: string;
  posterUrl: string | null;
  character?: string | null;
}
