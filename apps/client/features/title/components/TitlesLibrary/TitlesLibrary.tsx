"use client";

import { useSyncAllRatings } from "@/features/title/api/use-title-mutations";
import useTitles from "@/features/title/api/use-titles";
import { ADMIN } from "@/shared/lib/routes";
import Pagination from "@/shared/ui/Pagination";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { useRouter } from "next/navigation";
import { useState } from "react";
import TitlesFiltersPanel from "./components/TitlesFiltersPanel";
import TitlesPageHero from "./components/TitlesPageHero";
import TitlesTable from "./components/TitlesTable";
import { useTitlesFilters } from "./model/useTitlesFilters";

const LIMIT = 12;

export default function TitlesLibrary() {
  const router = useRouter();
  const { searchString, typeFilter, statusFilter, page, hasActiveFilters, updateFilters, resetFilters } = useTitlesFilters();
  const [syncResultMessage, setSyncResultMessage] = useState<string | null>(null);

  const { data, isPending, isFetching } = useTitles({
    page,
    limit: LIMIT,
    searchString,
    type: typeFilter || undefined,
    transcodingStatus: statusFilter || undefined,
  });

  const { mutate: syncAllRatings, isPending: isSyncingAllRatings } = useSyncAllRatings({
    onSuccess: ({ total, synced }) => setSyncResultMessage(`Synced ratings for ${synced}/${total} titles.`),
    onError: (error) => setSyncResultMessage(error.message || "Failed to sync ratings."),
  });

  const titles = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%", gap: "28px", p: { xs: "24px 16px 40px", md: "40px 36px 56px" } }}>
      <TitlesPageHero
        onCreate={() => router.push(ADMIN.TITLES_NEW)}
        onSyncAllRatings={() => {
          setSyncResultMessage(null);
          syncAllRatings();
        }}
        isSyncingAllRatings={isSyncingAllRatings}
      />

      {syncResultMessage && (
        <Alert severity="info" onClose={() => setSyncResultMessage(null)}>
          {syncResultMessage}
        </Alert>
      )}

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
