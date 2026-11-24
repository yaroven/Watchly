import type { ContentLocale } from "@shared/lib/content-locale";
import { GetAllGenresDto } from "../schemas/genre";

const genreKeys = {
  all: () => ["genre"] as const,
  listsPrefix: () => [...genreKeys.all(), "list"] as const,
  listPrefix: (params: GetAllGenresDto = {}) => [...genreKeys.listsPrefix(), params] as const,
  detailsPrefix: () => [...genreKeys.all(), "detail"] as const,
  detailPrefix: (id: string) => [...genreKeys.detailsPrefix(), id] as const,
  translations: (id: string) => [...genreKeys.detailPrefix(id), "translations"] as const,
  listFor: (params: GetAllGenresDto = {}, locale: ContentLocale) => [...genreKeys.listPrefix(params), { locale }] as const,
};

export default genreKeys;
