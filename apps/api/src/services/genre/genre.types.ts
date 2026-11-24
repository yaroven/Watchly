import { Genre, GenreTranslation } from "@prisma/client";
import { ContentLocaleView } from "../../common/utils/localize.util";

export interface GenreInput {
  name: string;
}

export interface GenreView {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  titleCount?: number;
  content: ContentLocaleView;
}

export type GenreWithTranslations = Genre & {
  translations?: GenreTranslation[];
  _count?: { titles: number };
};
