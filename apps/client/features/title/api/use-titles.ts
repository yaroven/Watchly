import { type LocalizedQueryOptions, useLocalizedQuery } from "@shared/api/localized-query";
import type { GetAllTitlesDto, Title } from "../schemas/title";
import { titleReads } from "./title.reads";

const useTitles = (params: GetAllTitlesDto = {}, options?: LocalizedQueryOptions<{ items: Title[]; totalCount: number }>) =>
  useLocalizedQuery(titleReads.list(params), options);

export default useTitles;
