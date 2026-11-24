import { catalogueCopies } from "@/features/title/api/catalogue-copies";
import type { TranslatableContent } from "@shared/api/content-translations";
import { GENRE_TRANSLATION_LIMITS } from "../schemas/genre";
import genreKeys from "./genre.keys";
import genreService from "./genre.service";

export const genreTranslations: TranslatableContent<"name"> = {
  kind: "genre",
  messages: "genre.translation",
  fields: [{ name: "name", maxLength: GENRE_TRANSLATION_LIMITS.name }],
  translationsKey: genreKeys.translations,
  copies: catalogueCopies.anyGenre,
  list: genreService.getTranslations,
  save: genreService.saveTranslation,
  remove: genreService.deleteTranslation,
};
