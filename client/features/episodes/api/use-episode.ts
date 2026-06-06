import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Episode } from "../schemas/episode";
import { episodeKeys } from "./episode.keys";
import EpisodeService from "./episode.service";

const useEpisode = (
  id: string,
  options?: Omit<
    UseQueryOptions<Episode, Error, Episode, readonly unknown[]>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: episodeKeys.detail(id),
    queryFn: () => EpisodeService.getById(id),
    ...options,
  });
};

export default useEpisode;
