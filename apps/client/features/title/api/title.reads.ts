import type { LocalizedRead } from "@shared/api/localized-query";
import type { CastCredit, GetAllTitlesDto, Title } from "../schemas/title";
import titleKeys from "./title.keys";
import titleService from "./title.service";

type TitlePage = { items: Title[]; totalCount: number };

export const titleReads = {
  detail: (id: string): LocalizedRead<Title> => ({
    key: ({ locale, viewerKey }) => titleKeys.detailFor(id, viewerKey, locale),
    fetch: (locale) => titleService.getById(id, locale),
  }),
  list: (params: GetAllTitlesDto = {}): LocalizedRead<TitlePage> => ({
    key: ({ locale, viewerKey }) => titleKeys.listFor(params, viewerKey, locale),
    fetch: (locale) => titleService.getAll(params, locale),
  }),
  cast: (id: string): LocalizedRead<CastCredit[]> => ({
    key: ({ locale }) => titleKeys.castFor(id, locale),
    fetch: (locale) => titleService.getCast(id, locale),
  }),
};
