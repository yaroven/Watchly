"use client";

import useTitles from "@/features/title/api/use-titles";
import { ADMIN } from "@/shared/lib/routes";
import Pagination from "@/shared/ui/Pagination";
import { useRouter } from "next/navigation";
import TitlesFiltersPanel from "./components/TitlesFiltersPanel";
import TitlesPageHero from "./components/TitlesPageHero";
import TitlesTable from "./components/TitlesTable";
import { useTitlesFilters } from "./model/useTitlesFilters";
import styles from "./TitlesLibrary.module.scss";

const LIMIT = 12;

export default function TitlesLibrary() {
  const router = useRouter();
  const { searchString, typeFilter, statusFilter, page, hasActiveFilters, updateFilters, resetFilters } = useTitlesFilters();

  const { data } = useTitles({
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
    <div className={styles.container}>
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

      <TitlesTable titles={titles} />

      <div className={styles.pagination}>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => updateFilters({ page: Number(p) })} />
      </div>
    </div>
  );
}
