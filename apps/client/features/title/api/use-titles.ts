import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { GetAllTitlesDto, Title } from "../schemas/title";
import titleKeys from "./title.keys";
import titleService from "./title.service";

const useTitles = (
  params: GetAllTitlesDto = {},
  options?: Omit<
    UseQueryOptions<{ items: Title[]; totalCount: number }, Error, { items: Title[]; totalCount: number }, readonly unknown[]>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: titleKeys.list(params),
    queryFn: () => titleService.getAll(params),
    ...options,
  });
};

export default useTitles;
