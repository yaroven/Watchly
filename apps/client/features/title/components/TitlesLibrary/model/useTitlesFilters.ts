"use client";

import { TitleType } from "@/features/title/schemas/title";
import TranscodingStatus from "@/types/transcoding-status";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { TitlesPageFilters } from "../types";

/**
 * Keeps the admin library's search, filters and page in the URL. Unknown enum
 * values coming back from the query string are treated as "no filter" rather
 * than forwarded to the API.
 */
export interface TitlesFiltersState {
  searchString: string;
  typeFilter: TitleType | "";
  statusFilter: TranscodingStatus | "";
  page: number;
  hasActiveFilters: boolean;
  updateFilters: (filters: TitlesPageFilters) => void;
  resetFilters: () => void;
}

export function useTitlesFilters(): TitlesFiltersState {
  const [filters, setFilters] = useQueryStates(
    {
      search: parseAsString.withDefault(""),
      type: parseAsString.withDefault(""),
      status: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
    },
    {
      history: "push",
      shallow: true,
    },
  );

  const typeFilter: TitleType | "" = filters.type === TitleType.MOVIE || filters.type === TitleType.SERIES ? filters.type : "";
  const statusFilter = Object.values(TranscodingStatus).includes(filters.status as TranscodingStatus)
    ? (filters.status as TranscodingStatus)
    : "";

  const updateFilters = (newFilters: TitlesPageFilters) => {
    void setFilters(() => {
      const nextFilters: { page?: number; search?: string; type?: string; status?: string } = {};

      const isFilterUpdated = newFilters.search !== undefined || newFilters.type !== undefined || newFilters.status !== undefined;

      if (isFilterUpdated) {
        nextFilters.page = 1;
      } else if (newFilters.page !== undefined) {
        nextFilters.page = newFilters.page;
      }

      if (newFilters.search !== undefined) {
        nextFilters.search = newFilters.search;
      }
      if (newFilters.type !== undefined) {
        nextFilters.type = newFilters.type;
      }
      if (newFilters.status !== undefined) {
        nextFilters.status = newFilters.status;
      }

      return nextFilters;
    });
  };

  const resetFilters = () => {
    void setFilters({
      search: null,
      type: null,
      status: null,
      page: 1,
    });
  };

  return {
    searchString: filters.search,
    typeFilter,
    statusFilter,
    page: filters.page,
    hasActiveFilters: Boolean(filters.search || typeFilter || statusFilter),
    updateFilters,
    resetFilters,
  };
}
