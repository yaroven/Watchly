import { type LocalizedQueryOptions, useLocalizedQuery } from "@shared/api/localized-query";
import type { Title } from "../schemas/title";
import { titleReads } from "./title.reads";

const useTitle = (id: string, options?: LocalizedQueryOptions<Title>) => useLocalizedQuery(titleReads.detail(id), options);

export default useTitle;
