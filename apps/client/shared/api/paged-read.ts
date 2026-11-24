"use client";

import { type QueryKey, useQueries } from "@tanstack/react-query";
import { useState } from "react";

export interface Page<T> {
  items: T[];
  totalCount: number;
}

export function mergePages<T extends { id: string }>(pages: (Page<T> | undefined)[]): { items: T[]; totalCount: number } {
  const seen = new Set<string>();
  const items: T[] = [];
  let totalCount = 0;
  for (const page of pages) {
    if (!page) break;
    totalCount = page.totalCount;
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }
  return { items, totalCount };
}

export const hasMorePages = (loaded: number, totalCount: number) => loaded < totalCount;

interface PageQuery<T> {
  queryKey: QueryKey;
  queryFn: () => Promise<Page<T>>;
}

export function usePagedRead<T extends { id: string }>(pageQuery: (page: number) => PageQuery<T>, { enabled = true } = {}) {
  const [pageCount, setPageCount] = useState(1);
  const results = useQueries({
    queries: Array.from({ length: pageCount }, (_, index) => ({ ...pageQuery(index + 1), enabled })),
  });
  const { items, totalCount } = mergePages(results.map((result) => result.data));
  const first = results[0];

  return {
    items,
    totalCount,
    hasMore: !!first?.data && hasMorePages(items.length, totalCount),
    isPending: !!first?.isPending,
    isLoadingMore: results.slice(1).some((result) => result.isFetching),
    isFetching: results.some((result) => result.isFetching),
    loadMore: () => setPageCount((count) => count + 1),
    reset: () => setPageCount(1),
  };
}
