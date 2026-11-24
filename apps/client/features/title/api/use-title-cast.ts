import { type LocalizedQueryOptions, useLocalizedQuery } from "@shared/api/localized-query";
import type { CastCredit } from "../schemas/title";
import { titleReads } from "./title.reads";

const useTitleCast = (id: string, options?: LocalizedQueryOptions<CastCredit[]>) => useLocalizedQuery(titleReads.cast(id), options);

export default useTitleCast;
