import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Season } from "../schemas/season";
import SeasonService from "./season.service";

const prefix = "seasons";

const useSeasons = (
  titleId: string,
  options?: Omit<UseQueryOptions<Season[], Error, Season[], string[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: [prefix, titleId],
    queryFn: () => SeasonService.getAll(titleId),
    ...options,
  });
};

export default useSeasons;
