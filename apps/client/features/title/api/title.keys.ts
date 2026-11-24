import type { ContentLocale } from "@shared/lib/content-locale";
import type { ViewerKey } from "@shared/lib/use-viewer";
import { GetAllTitlesDto } from "../schemas/title";

const titleKeys = {
  all: () => ["title"] as const,
  listsPrefix: () => [...titleKeys.all(), "list"] as const,
  listPrefix: (params: GetAllTitlesDto = {}) => [...titleKeys.listsPrefix(), params] as const,
  detailsPrefix: () => [...titleKeys.all(), "detail"] as const,
  detailPrefix: (id: string) => [...titleKeys.detailsPrefix(), id] as const,
  listFor: (params: GetAllTitlesDto = {}, viewerKey: ViewerKey, locale: ContentLocale) =>
    [...titleKeys.listPrefix(params), { viewerKey, locale }] as const,
  translations: (id: string) => [...titleKeys.detailPrefix(id), "translations"] as const,
  detailFor: (id: string, viewerKey: ViewerKey, locale: ContentLocale) => [...titleKeys.detailPrefix(id), { viewerKey, locale }] as const,
  stream: (id: string) => [...titleKeys.all(), "stream-url", id] as const,
  castsPrefix: () => [...titleKeys.all(), "cast"] as const,
  castPrefix: (id: string) => [...titleKeys.castsPrefix(), id] as const,
  castFor: (id: string, locale: ContentLocale) => [...titleKeys.castPrefix(id), { locale }] as const,
};

export default titleKeys;
