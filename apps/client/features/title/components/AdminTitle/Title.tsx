"use client";

import { type Title } from "@/features/title/schemas/title";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import TitleIdentity from "./components/TitleIdentity";
import TitleStatusBadge from "./components/TitleStatusBadge";
import styles from "./Title.module.scss";

interface TitleProps extends Title {
  to: string;
}

export default function Title({ createdAt, name, posterUrl = "/cat.webp", transcodingStatus, type, to }: TitleProps) {
  const createdYear = new Date(createdAt).getFullYear();
  const typeLabel = type === "MOVIE" ? "Movie" : "Series";

  return (
    <article className={styles.row}>
      <TitleIdentity name={name} posterUrl={posterUrl} to={to} type={type} />

      <div className={styles.yearCell} data-label="Year">
        {Number.isNaN(createdYear) ? "----" : createdYear}
      </div>

      <div className={styles.typeCell} data-label="Type">
        <span className={styles.typeBadge}>{typeLabel}</span>
      </div>

      <div className={styles.statusCell} data-label="Status">
        <TitleStatusBadge status={transcodingStatus} />
      </div>

      <div className={styles.actionsCell} data-label="Actions">
        <Link href={to} className={styles.actionLink}>
          Open
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}
