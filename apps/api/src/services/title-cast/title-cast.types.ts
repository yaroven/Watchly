import { ArtistView } from "../artist/artist.types";

export interface CastCreditInput {
  artistId: string;
  character?: string;
  order?: number;
}

export interface CastCreditView {
  id: string;
  character: string | null;
  order: number;
  artist: ArtistView;
}
