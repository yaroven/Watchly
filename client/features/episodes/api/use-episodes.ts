import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Episode } from "../schemas/episode";
import { episodeKeys } from "./episode.keys";
import EpisodeService from "./episode.service";

const useEpisodes = (
  seasonId: string,
  options?: Omit<
    UseQueryOptions<Episode[], Error, Episode[], readonly unknown[]>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: episodeKeys.list(seasonId),
    queryFn: () => EpisodeService.getAll(seasonId),
    ...options,
  });
};

export default useEpisodes;
