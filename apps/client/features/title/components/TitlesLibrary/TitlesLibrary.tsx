"use client";

import useTitles from "@/features/title/api/use-titles";
import { ADMIN } from "@/shared/lib/routes";
import Pagination from "@/shared/ui/Pagination";
import Box from "@mui/material/Box";
import { useRouter } from "next/navigation";
import TitlesFiltersPanel from "./components/TitlesFiltersPanel";
import TitlesPageHero from "./components/TitlesPageHero";
import TitlesTable from "./components/TitlesTable";
import { useTitlesFilters } from "./model/useTitlesFilters";

const LIMIT = 12;

export default function TitlesLibrary() {
  const router = useRouter();
  const { searchString, typeFilter, statusFilter, page, hasActiveFilters, updateFilters, resetFilters } = useTitlesFilters();

  const { data, isPending, isFetching } = useTitles({
    page,
    limit: LIMIT,
    searchString,
    type: typeFilter || undefined,
    transcodingStatus: statusFilter || undefined,
  });

  const titles = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%", gap: "28px", p: { xs: "24px 16px 40px", md: "40px 36px 56px" } }}>
      <TitlesPageHero onCreate={() => router.push(ADMIN.TITLES_NEW)} />

      <TitlesFiltersPanel
        searchString={searchString}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        onUpdateFilters={updateFilters}
        onResetFilters={resetFilters}
      />

      <TitlesTable titles={titles} loading={isPending || isFetching} />

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => updateFilters({ page: Number(p) })} />
      </Box>
    </Box>
  );
}
