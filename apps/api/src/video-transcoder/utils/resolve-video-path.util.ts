import { NotFoundException } from "@nestjs/common";
import { getEpisodeTitleAndSeasonId } from "../../episode/utils/episode-path.util";
import { PrismaService } from "../../prisma/prisma.service";
import { videoPath } from "../../s3/processed-key";
import { VideoType } from "../enums/video-type.enum";

export type VideoPathClient = Pick<PrismaService, "episode">;

export default async function resolveVideoPath(
  client: VideoPathClient,
  id: string,
  type: VideoType,
): Promise<string> {
  if (type !== VideoType.EPISODE) return videoPath({ type: VideoType.MOVIE, titleId: id });

  const episode = await client.episode.findUnique({ where: { id }, include: { season: true } });

  if (!episode) throw new NotFoundException(`Episode with id ${id} not found`);

  const { seasonId, titleId } = getEpisodeTitleAndSeasonId(episode);

  return videoPath({ type, titleId, seasonId, episodeId: episode.id });
}
