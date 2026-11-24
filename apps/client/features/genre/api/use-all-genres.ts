import { type LocalizedQueryOptions, useLocalizedQuery } from "@shared/api/localized-query";
import type { Genre } from "../schemas/genre";
import { genreReads } from "./genre.reads";

const ALL_GENRES_LIMIT = 100;

const useAllGenres = (options?: LocalizedQueryOptions<{ items: Genre[]; totalCount: number }>) =>
  useLocalizedQuery(genreReads.list({ limit: ALL_GENRES_LIMIT }), options);

export default useAllGenres;
