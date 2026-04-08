"use client";

import AdminTitle from "@/app/components/admin/Title";
import Pagination from "@/app/components/shared/Pagination";
import { TitleService } from "@/app/services/title.service";
import { Title, TitleType } from "@/app/types/title";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.scss";

interface AdminTitlesClientProps {
  initialData: { items: Title[]; totalCount: number };
  initialFilters: {
    searchString: string;
    type: TitleType | "";
    page: number;
  };
}

export default function AdminTitlesClient({ initialData, initialFilters }: AdminTitlesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const limit = 12;
  const searchString = searchParams.get("search") || "";
  const typeParam = searchParams.get("type");
  const typeFilter =
    typeParam === TitleType.MOVIE || typeParam === TitleType.SERIES ? typeParam : "";
  const page = Number(searchParams.get("page")) || 1;

  const { data } = useQuery({
    queryKey: ["adminTitles", searchString, typeFilter, page],
    queryFn: () =>
      TitleService.getAll({ searchString, page, limit, type: typeFilter || undefined }),
    initialData:
      page === initialFilters.page &&
      searchString === initialFilters.searchString &&
      typeFilter === initialFilters.type
        ? initialData
        : undefined,
  });

  const titles = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const updateFilters = (newFilters: { search?: string; type?: TitleType | ""; page?: number }) => {
    const params = new URLSearchParams(window.location.search);

    if (newFilters.search !== undefined) {
      if (newFilters.search) params.set("search", newFilters.search);
      else params.delete("search");
      params.set("page", "1");
    }

    if (newFilters.type !== undefined) {
      if (newFilters.type) params.set("type", newFilters.type);
      else params.delete("type");
      params.set("page", "1");
    }

    if (newFilters.page !== undefined) {
      params.set("page", newFilters.page.toString());
    }

    router.push(`?${params.toString()}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Search Title by name..."
            className={styles.searchInput}
            value={searchString}
            onChange={(e) => updateFilters({ search: e.target.value })}
          />

          <select
            className={styles.typeSelect}
            value={typeFilter}
            onChange={(e) => {
              const val = e.target.value as TitleType | "";
              updateFilters({ type: val });
            }}
          >
            <option value="">All Types</option>
            <option value={TitleType.MOVIE}>Movies</option>
            <option value={TitleType.SERIES}>Series</option>
          </select>
        </div>

        <button className={styles.addTitleButton} onClick={() => router.push("/admin/titles/new")}>
          Add new Title
        </button>
      </div>

      <div className={styles.titlesList}>
        {titles.map((title: Title) => (
          <div key={title.id} className={styles.titleItem}>
            <AdminTitle {...title} to={`/admin/titles/${title.id}`} />
          </div>
        ))}
      </div>

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
