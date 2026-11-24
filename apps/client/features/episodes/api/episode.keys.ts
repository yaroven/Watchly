import type { ContentLocale } from "@shared/lib/content-locale";

export const episodeKeys = {
  all: () => ["episodes"] as const,
  listsPrefix: () => [...episodeKeys.all(), "list"] as const,
  listPrefix: (seasonId: string) => [...episodeKeys.listsPrefix(), seasonId] as const,
  listFor: (seasonId: string, locale: ContentLocale) => [...episodeKeys.listPrefix(seasonId), { locale }] as const,
  detailsPrefix: () => [...episodeKeys.all(), "detail"] as const,
  detailPrefix: (id: string) => [...episodeKeys.detailsPrefix(), id] as const,
  detailFor: (id: string, locale: ContentLocale) => [...episodeKeys.detailPrefix(id), { locale }] as const,
  translations: (id: string) => [...episodeKeys.detailPrefix(id), "translations"] as const,
  stream: (id: string) => [...episodeKeys.detailPrefix(id), "stream-url"] as const,
};
