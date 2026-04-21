import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Episode } from "../schemas/episode";
import EpisodeService from "./episode.service";

const prefix = "episode";

const useEpisode = (
  id: string,
  options?: Omit<UseQueryOptions<Episode, Error, Episode, string[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: [prefix, id],
    queryFn: () => EpisodeService.getById(id),
    ...options,
  });
};

export default useEpisode;
