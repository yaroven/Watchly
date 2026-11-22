"use client";

import type { ContentLocale } from "@shared/lib/content-locale";
import { useContentLocale } from "@shared/lib/content-locale-scope";
import { useViewer, type ViewerKey } from "@shared/lib/use-viewer";
import { type QueryKey, useQuery, type UseQueryOptions } from "@tanstack/react-query";

export interface ReadScope {
  locale: ContentLocale;
  viewerKey: ViewerKey;
}

export interface LocalizedRead<TData> {
  key: (scope: ReadScope) => QueryKey;
  fetch: (locale: ContentLocale) => Promise<TData>;
}

export type LocalizedQueryOptions<TData> = Omit<UseQueryOptions<TData, Error, TData, QueryKey>, "queryKey" | "queryFn"> & {
  contentLocale?: ContentLocale;
};

export const localizedQuery = <TData>(read: LocalizedRead<TData>, scope: ReadScope) => ({
  queryKey: read.key(scope),
  queryFn: () => read.fetch(scope.locale),
});

export function useLocalizedQuery<TData>(read: LocalizedRead<TData>, { contentLocale, ...options }: LocalizedQueryOptions<TData> = {}) {
  const { viewerKey } = useViewer();
  const locale = useContentLocale(contentLocale);
  return useQuery({ ...options, ...localizedQuery(read, { locale, viewerKey }) });
}
