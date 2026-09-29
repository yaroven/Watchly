"use client";

import Role from "@/types/role";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { UsersPageFilters } from "../types";

export interface UsersFiltersState {
  searchString: string;
  roleFilter: Role | "";
  page: number;
  hasActiveFilters: boolean;
  updateFilters: (filters: UsersPageFilters) => void;
  resetFilters: () => void;
}

export function useUsersFilters(): UsersFiltersState {
  const [filters, setFilters] = useQueryStates(
    {
      search: parseAsString.withDefault(""),
      role: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
    },
    {
      history: "push",
      shallow: true,
    },
  );

  const roleFilter: Role | "" = filters.role === Role.ADMIN || filters.role === Role.USER ? filters.role : "";

  const updateFilters = (newFilters: UsersPageFilters) => {
    void setFilters(() => {
      const nextFilters: { page?: number; search?: string; role?: string } = {};

      const isFilterUpdated = newFilters.search !== undefined || newFilters.role !== undefined;

      if (isFilterUpdated) {
        nextFilters.page = 1;
      } else if (newFilters.page !== undefined) {
        nextFilters.page = newFilters.page;
      }

      if (newFilters.search !== undefined) {
        nextFilters.search = newFilters.search;
      }
      if (newFilters.role !== undefined) {
        nextFilters.role = newFilters.role;
      }

      return nextFilters;
    });
  };

  const resetFilters = () => {
    void setFilters({
      search: null,
      role: null,
      page: 1,
    });
  };

  return {
    searchString: filters.search,
    roleFilter,
    page: filters.page,
    hasActiveFilters: Boolean(filters.search || roleFilter),
    updateFilters,
    resetFilters,
  };
}
