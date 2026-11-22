import type { ContentLocale } from "@shared/lib/content-locale";

const seasonKeys = {
  all: () => ["seasons"] as const,
  listsPrefix: () => [...seasonKeys.all(), "list"] as const,
  listPrefix: (titleId: string) => [...seasonKeys.listsPrefix(), titleId] as const,
  listFor: (titleId: string, locale: ContentLocale) => [...seasonKeys.listPrefix(titleId), { locale }] as const,
  detailsPrefix: () => [...seasonKeys.all(), "detail"] as const,
  detailPrefix: (id: string) => [...seasonKeys.detailsPrefix(), id] as const,
  translations: (id: string) => [...seasonKeys.detailPrefix(id), "translations"] as const,
  detailFor: (id: string, locale: ContentLocale) => [...seasonKeys.detailPrefix(id), { locale }] as const,
};

export default seasonKeys;
