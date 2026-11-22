import { type LocalizedQueryOptions, useLocalizedQuery } from "@shared/api/localized-query";
import type { Season } from "../schemas/season";
import { seasonReads } from "./season.reads";

const useSeason = (id: string, options?: LocalizedQueryOptions<Season>) => useLocalizedQuery(seasonReads.detail(id), options);

export default useSeason;
