import type { LocalizedRead } from "@shared/api/localized-query";
import type { Season } from "../schemas/season";
import seasonKeys from "./season.keys";
import SeasonService from "./season.service";

export const seasonReads = {
  detail: (id: string): LocalizedRead<Season> => ({
    key: ({ locale }) => seasonKeys.detailFor(id, locale),
    fetch: (locale) => SeasonService.getById(id, locale),
  }),
  list: (titleId: string): LocalizedRead<Season[]> => ({
    key: ({ locale }) => seasonKeys.listFor(titleId, locale),
    fetch: (locale) => SeasonService.getAll(titleId, locale),
  }),
};
