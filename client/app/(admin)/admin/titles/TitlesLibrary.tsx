"use client";

import useTitles from "@/features/title/api/use-titles";
import { Title, TitleType } from "@/features/title/schemas/title";
import Pagination from "@/shared/ui/Pagination";
import TranscodingStatus from "@/types/transcoding-status";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import TitlesFiltersPanel from "./components/TitlesFiltersPanel";
import TitlesPageHero from "./components/TitlesPageHero";
import TitlesTable from "./components/TitlesTable";
import { TitlesPageFilters } from "./components/types";
import styles from "./page.module.scss";

export default function TitlesLibrary() {
  const router = useRouter();
  const limit = 12;

  // Setup nuqs query state for admin search, filters and pagination
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

  const searchString = filters.search;
  const typeFilter =
    filters.type === TitleType.MOVIE || filters.type === TitleType.SERIES ? filters.type : "";
  const statusFilter = Object.values(TranscodingStatus).includes(filters.status as TranscodingStatus)
    ? (filters.status as TranscodingStatus)
    : "";
  const page = filters.page;

  const { data } = useTitles({
    page,
    limit,
    searchString,
    type: typeFilter || undefined,
    transcodingStatus: statusFilter || undefined,
  });

  const titles = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);
  const hasActiveFilters = Boolean(searchString || typeFilter || statusFilter);

  const updateFilters = (newFilters: TitlesPageFilters) => {
    void setFilters((prev) => {
      const nextFilters: any = {};

      const isFilterUpdated =
        newFilters.search !== undefined ||
        newFilters.type !== undefined ||
        newFilters.status !== undefined;

      if (isFilterUpdated) {
        nextFilters.page = 1;
      } else if (newFilters.page !== undefined) {
        nextFilters.page = newFilters.page;
      }

      if (newFilters.search !== undefined) {
        nextFilters.search = newFilters.search || null;
      }
      if (newFilters.type !== undefined) {
        nextFilters.type = newFilters.type || null;
      }
      if (newFilters.status !== undefined) {
        nextFilters.status = newFilters.status || null;
      }

      return nextFilters;
    });
  };

  const handleResetFilters = () => {
    void setFilters({
      search: null,
      type: null,
      status: null,
      page: 1,
    });
  };

  return (
    <div className={styles.container}>
      <TitlesPageHero onCreate={() => router.push("/admin/titles/new")} />

      <TitlesFiltersPanel
        searchString={searchString}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        onUpdateFilters={updateFilters}
        onResetFilters={handleResetFilters}
      />

      <TitlesTable titles={titles} />

      <div className={styles.pagination}>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => updateFilters({ page: Number(p) })} />
      </div>
    </div>
  );
}
