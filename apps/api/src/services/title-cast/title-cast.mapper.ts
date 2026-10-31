import { Artist, CastCredit } from "@prisma/client";
import { toArtistView } from "../artist/artist.mapper";
import { CastCreditView } from "./title-cast.types";

export const toCastCreditView = (
  credit: CastCredit & { artist: Artist },
  artistPhotoUrl: string | null,
): CastCreditView => ({
  id: credit.id,
  character: credit.character,
  order: credit.order,
  artist: toArtistView(credit.artist, artistPhotoUrl),
});
