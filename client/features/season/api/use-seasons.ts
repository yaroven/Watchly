import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Season } from "../schemas/season";
import seasonKeys from "./season.keys";
import SeasonService from "./season.service";

const useSeasons = (
  titleId: string,
  options?: Omit<UseQueryOptions<Season[], Error, Season[], readonly unknown[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: seasonKeys.list(titleId),
    queryFn: () => SeasonService.getAll(titleId),
    ...options,
  });
};

export default useSeasons;
