import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { GetAllTitlesDto, Title } from "../schemas/title";
import titleService from "./title.service";

const useTitles = (
  params: GetAllTitlesDto = {},
  options?: Omit<
    UseQueryOptions<
      { items: Title[]; totalCount: number },
      Error,
      { items: Title[]; totalCount: number },
      unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["title", params],
    queryFn: () => titleService.getAll(params),
    ...options,
  });
};

export default useTitles;
