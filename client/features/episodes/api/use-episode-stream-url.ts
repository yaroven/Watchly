import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import EpisodeService from "./episode.service";

const prefix = "episode";

const useEpisodeStreamUrl = (
  id: string,
  options?: Omit<UseQueryOptions<string, Error, string, string[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: [prefix, id, "stream-url"],
    queryFn: () => EpisodeService.getStreamUrl(id),
    ...options,
  });
};

export default useEpisodeStreamUrl;
