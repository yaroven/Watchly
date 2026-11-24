import type { LocalizedRead } from "@shared/api/localized-query";
import type { Genre, GetAllGenresDto } from "../schemas/genre";
import genreKeys from "./genre.keys";
import genreService from "./genre.service";

type GenrePage = { items: Genre[]; totalCount: number };

export const genreReads = {
  list: (params: GetAllGenresDto = {}): LocalizedRead<GenrePage> => ({
    key: ({ locale }) => genreKeys.listFor(params, locale),
    fetch: (locale) => genreService.getAll(params, locale),
  }),
};
