import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import titleKeys from "./title.keys";
import titleService from "./title.service";

const useTitleStreamUrl = (
  id: string,
  options?: Omit<UseQueryOptions<string, Error, string, readonly unknown[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: titleKeys.stream(id),
    queryFn: () => titleService.getStreamUrl(id),
    ...options,
  });
};

export default useTitleStreamUrl;
