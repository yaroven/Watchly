import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Season } from "../schemas/season";
import seasonKeys from "./season.keys";
import SeasonService from "./season.service";

const useSeason = (id: string, options?: Omit<UseQueryOptions<Season, Error, Season, readonly unknown[]>, "queryKey" | "queryFn">) => {
  return useQuery({
    queryKey: seasonKeys.detail(id),
    queryFn: () => SeasonService.getById(id),
    ...options,
  });
};

export default useSeason;
