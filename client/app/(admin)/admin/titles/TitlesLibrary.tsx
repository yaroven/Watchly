"use client";

import useTitles from "@/features/title/api/use-titles";
import { Title, TitleType } from "@/features/title/schemas/title";
import Pagination from "@/shared/ui/Pagination";
import TranscodingStatus from "@/types/transcoding-status";
import { useRouter, useSearchParams } from "next/navigation";
import { buildTitlesSearchParams } from "./components/buildTitlesSearchParams";
import TitlesFiltersPanel from "./components/TitlesFiltersPanel";
import TitlesPageHero from "./components/TitlesPageHero";
import TitlesTable from "./components/TitlesTable";
import { TitlesPageFilters } from "./components/types";
import styles from "./page.module.scss";

interface TitlesLibraryProps {
  initialData: { items: Title[]; totalCount: number };
  initialFilters: {
    searchString: string;
    type: TitleType | "";
    page: number;
  };
}

export default function TitlesLibrary({ initialData, initialFilters }: TitlesLibraryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const limit = 12;
  const searchString = searchParams.get("search") || "";
  const typeParam = searchParams.get("type");
  const statusParam = searchParams.get("status");
  const typeFilter =
    typeParam === TitleType.MOVIE || typeParam === TitleType.SERIES ? typeParam : "";
  const statusFilter = Object.values(TranscodingStatus).includes(statusParam as TranscodingStatus)
    ? (statusParam as TranscodingStatus)
    : "";
  const page = Number(searchParams.get("page")) || 1;

  const { data } = useTitles(
    {
      page,
      limit,
      searchString,
      type: typeFilter || undefined,
    },
    {
      initialData:
        page === initialFilters.page &&
        searchString === initialFilters.searchString &&
        typeFilter === initialFilters.type
          ? initialData
          : undefined,
    },
  );

  const titles = data?.items || [];
  const filteredTitles = statusFilter
    ? titles.filter((title) => title.transcodingStatus === statusFilter)
    : titles;
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);
  const hasActiveFilters = Boolean(searchString || typeFilter || statusFilter);

  const updateFilters = (newFilters: TitlesPageFilters) => {
    const nextSearchParams = buildTitlesSearchParams(searchParams.toString(), newFilters);
    router.push(`?${nextSearchParams}`);
  };

  return (
    <div className={styles.container}>
      <TitlesPageHero onCreate={() => router.push("/admin/titles/new")} />

      <TitlesFiltersPanel
        searchString={searchString}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        totalCount={statusFilter ? filteredTitles.length : totalCount}
        hasActiveFilters={hasActiveFilters}
        onUpdateFilters={updateFilters}
        onResetFilters={() => router.push("?page=1")}
      />

      <TitlesTable titles={filteredTitles} />

      <div className={styles.pagination}>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(p) => updateFilters({ page: p })}
        />
      </div>
    </div>
  );
}
