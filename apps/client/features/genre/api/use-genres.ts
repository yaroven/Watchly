import { type LocalizedQueryOptions, useLocalizedQuery } from "@shared/api/localized-query";
import type { Genre, GetAllGenresDto } from "../schemas/genre";
import { genreReads } from "./genre.reads";

const useGenres = (params: GetAllGenresDto = {}, options?: LocalizedQueryOptions<{ items: Genre[]; totalCount: number }>) =>
  useLocalizedQuery(genreReads.list(params), options);

export default useGenres;
