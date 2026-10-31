import { Episode } from "@prisma/client";
import { EpisodeView } from "./episode.types";

export const toEpisodeView = (episode: Episode): EpisodeView => ({
  id: episode.id,
  createdAt: episode.createdAt,
  updatedAt: episode.updatedAt,
  number: episode.number,
  name: episode.name,
  description: episode.description,
  seasonId: episode.seasonId,
  transcodingStatus: episode.transcodingStatus,
});
