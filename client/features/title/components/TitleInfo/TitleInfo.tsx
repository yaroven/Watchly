"use client";

import { Title } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import { Skeleton } from "@/shared/ui/Skeleton";
import Image from "next/image";
import styles from "./TitleInfo.module.scss";

interface TitleInfoProps {
  title: Title;
}

export default function TitleInfo({ title }: TitleInfoProps) {
  const { name, description, posterUrl, type, seasons, createdAt, transcodingStatus } = title;
  const posterSrc = getOptimizedImageSrc(posterUrl);
  const releaseYear =
    createdAt && !Number.isNaN(new Date(createdAt).getTime())
      ? new Date(createdAt).getFullYear()
      : "New";

  const infoData = [
    { label: "Format", value: type === "MOVIE" ? "Feature movie" : "Series" },
    { label: "Library status", value: String(transcodingStatus).toLowerCase() },
    { label: "Seasons", value: type === "SERIES" ? String(seasons?.length) : "Standalone" },
    { label: "Added", value: String(releaseYear) },
  ];

  return (
    <div className={styles.titleInfoContainer}>
      <div className={styles.posterContainer}>
        <Image
          className={styles.poster}
          src={posterSrc}
          alt={name}
          width={320}
          height={460}
          priority
        />
      </div>
      <div className={styles.titleInfo}>
        <div className={styles.header}>
          <div className={styles.badges}>
            <span>{type === "MOVIE" ? "Movie" : "Series"}</span>
            <span>{releaseYear}</span>
          </div>
          <div className={styles.titleBlock}>
            <h2>{name}</h2>
            <p>
              Clean presentation, elevated contrast, and quick context around every title before
              playback starts.
            </p>
          </div>
        </div>

        <div className={styles.infoList}>
          {infoData.map((item, index) => (
            <div key={index} className={styles.row}>
              <span className={styles.label}>{item.label}</span>
              <span className={styles.value}>{item.value}</span>
            </div>
          ))}
        </div>

        <div className={styles.description}>
          {description || "Description will appear here once added."}
        </div>
      </div>
    </div>
  );
}

export function TitleInfoSkeleton() {
  return (
    <div className={styles.titleInfoContainer}>
      <div className={styles.posterContainer}>
        <Skeleton width={250} height={400} />
      </div>
      <div className={styles.titleInfo} style={{ flex: 1 }}>
        <Skeleton width="60%" height={40} />
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} width="40%" height={20} />
          ))}
        </div>
        <Skeleton width="100%" height={100} />
      </div>
    </div>
  );
}
