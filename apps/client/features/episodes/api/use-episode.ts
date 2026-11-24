import { type LocalizedQueryOptions, useLocalizedQuery } from "@shared/api/localized-query";
import type { Episode } from "../schemas/episode";
import { episodeReads } from "./episode.reads";

const useEpisode = (id: string, options?: LocalizedQueryOptions<Episode>) => useLocalizedQuery(episodeReads.detail(id), options);

export default useEpisode;
