import { type LocalizedQueryOptions, useLocalizedQuery } from "@shared/api/localized-query";
import type { Season } from "../schemas/season";
import { seasonReads } from "./season.reads";

const useSeasons = (titleId: string, options?: LocalizedQueryOptions<Season[]>) => useLocalizedQuery(seasonReads.list(titleId), options);

export default useSeasons;
