import type { LocalizedRead } from "@shared/api/localized-query";
import type { Episode } from "../schemas/episode";
import { episodeKeys } from "./episode.keys";
import EpisodeService from "./episode.service";

export const episodeReads = {
  detail: (id: string): LocalizedRead<Episode> => ({
    key: ({ locale }) => episodeKeys.detailFor(id, locale),
    fetch: (locale) => EpisodeService.getById(id, locale),
  }),
  list: (seasonId: string): LocalizedRead<Episode[]> => ({
    key: ({ locale }) => episodeKeys.listFor(seasonId, locale),
    fetch: (locale) => EpisodeService.getAll(seasonId, locale),
  }),
};
