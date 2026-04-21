"use client";

import useTitles from "@/features/title/api/use-titles";
import { Title, TitleType } from "@/features/title/schemas/title";
import Pagination from "@/shared/ui/Pagination";
import { TranscodingStatus } from "@/types";
import { useRouter } from "next/navigation";
import TitleList from "../TitleList";
import styles from "./Catalog.module.scss";

interface CatalogProps {
  type?: TitleType;
  initialData?: { items: Title[]; totalCount: number };
  initialPage?: number;
  eyebrow?: string;
  title?: string;
  description?: string;
}

export default function Catalog({
  type,
  initialData,
  initialPage = 1,
  eyebrow = "Streaming library",
  title = "Fresh picks for tonight",
  description = "Browse the latest additions, open a title instantly, and keep the same clean dashboard energy outside the admin panel.",
}: CatalogProps) {
  const router = useRouter();
  const limit = 18;

  const { data } = useTitles(
    { page: initialPage, limit, type, transcodingStatus: TranscodingStatus.COMPLETED },
    { initialData: initialPage === 1 ? initialData : undefined },
  );

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
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <strong>{totalCount}</strong>
            <span>Titles available</span>
          </div>
          <div className={styles.statCard}>
            <strong>
              {type === TitleType.SERIES ? "Series" : type === TitleType.MOVIE ? "Movies" : "All"}
            </strong>
            <span>Current catalog view</span>
          </div>
        </div>
      </section>

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
