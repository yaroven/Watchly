import { Artist, CastCredit, Title } from "@prisma/client";
import { ArtistFilmographyItemView, ArtistView } from "./artist.types";

export const toArtistView = (artist: Artist, photoUrl: string | null = null): ArtistView => ({
  id: artist.id,
  createdAt: artist.createdAt,
  updatedAt: artist.updatedAt,
  name: artist.name,
  photoUrl,
});

export const toArtistFilmographyItemView = (
  credit: CastCredit & { title: Title },
  posterUrl: string | null,
): ArtistFilmographyItemView => ({
  titleId: credit.title.id,
  name: credit.title.name,
  posterUrl,
  character: credit.character,
});
