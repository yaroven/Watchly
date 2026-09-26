import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Genre, GetAllGenresDto } from "../schemas/genre";
import genreKeys from "./genre.keys";
import genreService from "./genre.service";

const useGenres = (
  params: GetAllGenresDto = {},
  options?: Omit<
    UseQueryOptions<{ items: Genre[]; totalCount: number }, Error, { items: Genre[]; totalCount: number }, readonly unknown[]>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: genreKeys.list(params),
    queryFn: () => genreService.getAll(params),
    ...options,
  });
};

export default useGenres;
