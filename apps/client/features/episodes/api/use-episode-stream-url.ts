import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { episodeKeys } from "./episode.keys";
import EpisodeService from "./episode.service";

const useEpisodeStreamUrl = (
  id: string,
  options?: Omit<UseQueryOptions<string, Error, string, readonly unknown[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: episodeKeys.stream(id),
    queryFn: () => EpisodeService.getStreamUrl(id),
    ...options,
  });
};

export default useEpisodeStreamUrl;
