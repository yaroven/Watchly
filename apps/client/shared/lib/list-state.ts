"use client";

import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";

export function lastPage(totalCount: number, limit: number): number {
  return Math.max(1, Math.ceil(totalCount / limit));
}

export function clampPage(page: number, totalCount: number, limit: number): number {
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(Math.floor(page), lastPage(totalCount, limit));
}

export function parseEnumValue<T extends string>(value: string | null | undefined, allowed: readonly T[]): T | "" {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

export function useClampedPage(page: number, totalCount: number | undefined, limit: number, setPage: (page: number) => void) {
  useEffect(() => {
    if (totalCount === undefined) return;
    const clamped = clampPage(page, totalCount, limit);
    if (clamped !== page) setPage(clamped);
  }, [page, totalCount, limit, setPage]);
}

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useSearchPageParams() {
  const [{ search, page }, setParams] = useQueryStates(
    { search: parseAsString.withDefault(""), page: parseAsInteger.withDefault(1) },
    { history: "push", shallow: true },
  );
  return {
    search,
    page,
    setSearch: (next: string) => void setParams({ search: next || null, page: null }),
    setPage: (next: number) => void setParams({ page: next > 1 ? next : null }),
  };
}
