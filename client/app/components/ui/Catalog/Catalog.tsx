"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { TitleService } from "../../../services/title.service";
import { Title, TitleType } from "../../../types/title";
import Pagination from "../../shared/Pagination";
import TitleList from "../TitleList";
import styles from "./Catalog.module.scss";

interface CatalogProps {
  type?: TitleType;
  initialData?: { items: Title[]; totalCount: number };
  initialPage?: number;
}

export default function Catalog({ type, initialData, initialPage = 1 }: CatalogProps) {
  const router = useRouter();
  const limit = 18;

  const { data } = useQuery<{ items: Title[]; totalCount: number }>({
    queryKey: ["titles", type, initialPage],
    queryFn: () => TitleService.getAll({ page: initialPage, limit, type }),
    initialData: initialPage === 1 ? initialData : undefined,
  });

  const titles = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className={styles.catalog}>
      <TitleList
        titles={titles}
        onClick={(id: string, type: TitleType) => {
          if (type === "MOVIE") return router.push(`/movie/${id}`);
          return router.push(`/series/${id}`);
        }}
      />
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Pagination
            currentPage={initialPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
