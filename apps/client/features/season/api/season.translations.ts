import { catalogueCopies } from "@/features/title/api/catalogue-copies";
import type { TranslatableContent } from "@shared/api/content-translations";
import { SEASON_TRANSLATION_LIMITS } from "../schemas/season";
import seasonKeys from "./season.keys";
import SeasonService from "./season.service";

export const seasonTranslations: TranslatableContent<"name" | "description"> = {
  kind: "season",
  messages: "season.translation",
  fields: [
    { name: "name", maxLength: SEASON_TRANSLATION_LIMITS.name },
    { name: "description", maxLength: SEASON_TRANSLATION_LIMITS.description, multiline: true },
  ],
  translationsKey: seasonKeys.translations,
  copies: catalogueCopies.season,
  list: SeasonService.getTranslations,
  save: SeasonService.saveTranslation,
  remove: SeasonService.deleteTranslation,
};
