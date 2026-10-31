import type { ViewerKey } from "@shared/lib/use-viewer";
import type { QueryFilters } from "@tanstack/react-query";

export const forViewer = (prefix: readonly unknown[], viewerKey: ViewerKey): QueryFilters => ({
  predicate: ({ queryKey }) => startsWith(queryKey, prefix) && viewerKeyOf(queryKey) === viewerKey,
});

const startsWith = (queryKey: readonly unknown[], prefix: readonly unknown[]): boolean =>
  prefix.every((segment, index) => Object.is(queryKey[index], segment));

const viewerKeyOf = (queryKey: readonly unknown[]): unknown => {
  const last = queryKey[queryKey.length - 1];
  if (typeof last !== "object" || last === null || !("viewerKey" in last)) return undefined;

  return (last as { viewerKey: unknown }).viewerKey;
};
