import { TitlesPageFilters } from "./types";

export function buildTitlesSearchParams(
  currentSearchParams: string,
  newFilters: TitlesPageFilters,
) {
  const params = new URLSearchParams(currentSearchParams);

  const syncFilter = (key: "search" | "type" | "status", value?: string) => {
    if (value !== undefined) {
      if (value) params.set(key, value);
      else params.delete(key);
      params.set("page", "1");
    }
  };

  syncFilter("search", newFilters.search);
  syncFilter("type", newFilters.type);
  syncFilter("status", newFilters.status);

  if (newFilters.page !== undefined) {
    params.set("page", newFilters.page.toString());
  }

  return params.toString();
}
