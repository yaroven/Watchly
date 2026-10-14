import assertExistsUtil from "../../common/utils/assert-exists.util";
import { PrismaService } from "../../prisma/prisma.service";

export type GenreExistenceClient = Pick<PrismaService, "genre">;

export default function assertGenreExists(client: GenreExistenceClient, id: string): Promise<void> {
  return assertExistsUtil(client.genre, id, "Genre");
}
