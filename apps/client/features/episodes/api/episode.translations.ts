import { catalogueCopies } from "@/features/title/api/catalogue-copies";
import type { TranslatableContent } from "@shared/api/content-translations";
import { EPISODE_TRANSLATION_LIMITS } from "../schemas/episode";
import { episodeKeys } from "./episode.keys";
import EpisodeService from "./episode.service";

export const episodeTranslations: TranslatableContent<"name" | "description"> = {
  kind: "episode",
  messages: "episodes.translation",
  fields: [
    { name: "name", maxLength: EPISODE_TRANSLATION_LIMITS.name },
    { name: "description", maxLength: EPISODE_TRANSLATION_LIMITS.description, multiline: true },
  ],
  translationsKey: episodeKeys.translations,
  copies: catalogueCopies.episode,
  list: EpisodeService.getTranslations,
  save: EpisodeService.saveTranslation,
  remove: EpisodeService.deleteTranslation,
};
