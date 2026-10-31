export interface ArtistInput {
  name: string;
}

export interface ArtistView {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  photoUrl: string | null;
}

export interface ArtistFilmographyItemView {
  titleId: string;
  name: string;
  posterUrl: string | null;
  character: string | null;
}
