import assertExistsUtil from "../../common/utils/assert-exists.util";
import { PrismaService } from "../../prisma/prisma.service";

export type EpisodeExistenceClient = Pick<PrismaService, "episode">;

export default function assertEpisodeExists(
  client: EpisodeExistenceClient,
  id: string,
): Promise<void> {
  return assertExistsUtil(client.episode, id, "Episode");
}
