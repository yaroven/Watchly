import { type LocalizedQueryOptions, useLocalizedQuery } from "@shared/api/localized-query";
import type { Episode } from "../schemas/episode";
import { episodeReads } from "./episode.reads";

const useEpisodes = (seasonId: string, options?: LocalizedQueryOptions<Episode[]>) =>
  useLocalizedQuery(episodeReads.list(seasonId), options);

export default useEpisodes;
