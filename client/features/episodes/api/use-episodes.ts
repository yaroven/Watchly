import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Episode } from "../schemas/episode";
import EpisodeService from "./episode.service";

const prefix = "episodes";

const useEpisodes = (
  seasonId: string,
  options?: Omit<UseQueryOptions<Episode[], Error, Episode[], string[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: [prefix, seasonId],
    queryFn: () => EpisodeService.getAll(seasonId),
    ...options,
  });
};

export default useEpisodes;
