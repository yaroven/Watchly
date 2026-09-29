"use client";

import { useUsers } from "@/features/user/api/use-users";
import Pagination from "@/shared/ui/Pagination";
import Box from "@mui/material/Box";
import UsersFiltersPanel from "./components/UsersFiltersPanel";
import UsersPageHero from "./components/UsersPageHero";
import UsersTable from "./components/UsersTable";
import { useUsersFilters } from "./model/useUsersFilters";

const LIMIT = 12;

export default function UsersLibrary() {
  const { searchString, roleFilter, page, hasActiveFilters, updateFilters, resetFilters } = useUsersFilters();

  const { data, isPending, isFetching } = useUsers({
    page,
    limit: LIMIT,
    searchString,
    role: roleFilter || undefined,
  });

  const users = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%", gap: "28px", p: { xs: "24px 16px 40px", md: "40px 36px 56px" } }}>
      <UsersPageHero totalCount={totalCount} />

      <UsersFiltersPanel
        searchString={searchString}
        roleFilter={roleFilter}
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        onUpdateFilters={updateFilters}
        onResetFilters={resetFilters}
      />

      <UsersTable users={users} loading={isPending || isFetching} />

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => updateFilters({ page: Number(p) })} />
      </Box>
    </Box>
  );
}
