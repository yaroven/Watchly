import assertExistsUtil from "../../common/utils/assert-exists.util";
import { PrismaService } from "../../prisma/prisma.service";

export type ArtistExistenceClient = Pick<PrismaService, "artist">;

export default function assertArtistExists(
  client: ArtistExistenceClient,
  id: string,
): Promise<void> {
  return assertExistsUtil(client.artist, id, "Artist");
}
