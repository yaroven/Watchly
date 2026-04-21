import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Season } from "../schemas/season";
import SeasonService from "./season.service";

const prefix = "seasons";

const useSeason = (
  id: string,
  options?: Omit<UseQueryOptions<Season, Error, Season, string[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: [prefix, id],
    queryFn: () => SeasonService.getById(id),
    ...options,
  });
};

export default useSeason;
