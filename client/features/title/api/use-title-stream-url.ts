import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import titleService from "./title.service";

const prefix = "title";

const useTitleStreamUrl = (
  id: string,
  options?: Omit<UseQueryOptions<string, Error, string, string[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: [prefix, id, "stream-url"],
    queryFn: () => titleService.getStreamUrl(id),
    ...options,
  });
};

export default useTitleStreamUrl;
