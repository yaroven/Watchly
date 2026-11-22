import type { TranslatableContent } from "@shared/api/content-translations";
import { TITLE_TRANSLATION_LIMITS } from "../schemas/title";
import { catalogueCopies } from "./catalogue-copies";
import titleKeys from "./title.keys";
import titleService from "./title.service";

export const titleTranslations: TranslatableContent<"name" | "description"> = {
  kind: "title",
  messages: "title.translation",
  fields: [
    { name: "name", maxLength: TITLE_TRANSLATION_LIMITS.name },
    { name: "description", maxLength: TITLE_TRANSLATION_LIMITS.description, multiline: true },
  ],
  translationsKey: titleKeys.translations,
  copies: catalogueCopies.title,
  list: titleService.getTranslations,
  save: titleService.saveTranslation,
  remove: titleService.deleteTranslation,
};
