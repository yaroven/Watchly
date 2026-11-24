import { Locale } from "../../common/locale.const";
import { localize, translationFor } from "../../common/utils/localize.util";
import { GenreView, GenreWithTranslations } from "./genre.types";

export const toGenreView = (genre: GenreWithTranslations, locale: Locale): GenreView => {
  const translation = translationFor(genre.translations, locale);
  const { fields, content } = localize(
    { name: genre.name },
    translation && { name: translation.name },
    locale,
  );

  return {
    id: genre.id,
    createdAt: genre.createdAt,
    updatedAt: genre.updatedAt,
    name: fields.name,
    titleCount: genre._count?.titles,
    content,
  };
};
