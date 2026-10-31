import { Genre } from "@prisma/client";
import { GenreView } from "./genre.types";

export const toGenreView = (genre: Genre & { _count?: { titles: number } }): GenreView => ({
  id: genre.id,
  createdAt: genre.createdAt,
  updatedAt: genre.updatedAt,
  name: genre.name,
  titleCount: genre._count?.titles,
});
