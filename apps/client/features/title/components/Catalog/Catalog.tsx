"use client";

import useTitles from "@/features/title/api/use-titles";
import { TitleType } from "@/features/title/schemas/title";
import Pagination from "@/shared/ui/Pagination";
import { TranscodingStatus } from "@/types";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import TitleList from "../TitleList";
import styles from "./Catalog.module.scss";

interface CatalogProps {
  type?: TitleType;
  eyebrow?: string;
  title?: string;
  description?: string;
}

export default function Catalog({
  type,
  eyebrow = "Streaming library",
  title = "Fresh picks for tonight",
  description = "Browse the latest additions, open a title instantly, and keep the same clean dashboard energy outside the admin panel.",
}: CatalogProps) {
  const router = useRouter();
  const limit = 18;
  const [page, setPage] = useQueryState("page");
  const currentPage = page ? parseInt(page) : 1;

  const { data } = useTitles({
    page: currentPage,
    limit,
    type,
    transcodingStatus: TranscodingStatus.COMPLETED,
  });
  const titles = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);

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
            <strong>{type === TitleType.SERIES ? "Series" : type === TitleType.MOVIE ? "Movies" : "All"}</strong>
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
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
