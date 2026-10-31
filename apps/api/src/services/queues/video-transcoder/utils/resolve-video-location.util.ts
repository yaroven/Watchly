import { NotFoundException } from "@nestjs/common";
import { getEpisodeTitleAndSeasonId } from "../../../episode/utils/episode-path.util";
import { PrismaService } from "../../../prisma/prisma.service";
import { VideoLocation } from "../../../s3/processed-key";
import { VideoType } from "../enums/video-type.enum";

export type VideoLocationClient = Pick<PrismaService, "episode">;

export default async function resolveVideoLocation(
  client: VideoLocationClient,
  id: string,
  type: VideoType,
): Promise<VideoLocation> {
  if (type !== VideoType.EPISODE) return { type: VideoType.MOVIE, titleId: id };

  const episode = await client.episode.findUnique({ where: { id }, include: { season: true } });

  if (!episode) throw new NotFoundException(`Episode with id ${id} not found`);

  const { seasonId, titleId } = getEpisodeTitleAndSeasonId(episode);

  return { type, titleId, seasonId, episodeId: episode.id };
}
