"use client";

import { type Title } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import { PlayCircle } from "lucide-react";
import Image from "next/image";
import styles from "./Title.module.scss";

interface TitleProps extends Title {
  onClick: () => void;
}

export default function Title({
  name,
  posterUrl = "/cat.webp",
  type,
  transcodingStatus,
  onClick,
}: TitleProps) {
  const posterSrc = getOptimizedImageSrc(posterUrl);

  return (
    <button type="button" onClick={() => onClick()} className={styles.title}>
      <div className={styles.posterConteiner}>
        <Image
          className={styles.poster}
          src={posterSrc}
          alt={name}
          width={150}
          height={225}
        />
        <div className={styles.posterBlackout}></div>
        <div className={styles.posterOverlay}>
          <PlayCircle size={52} />
          <span>Open details</span>
        </div>
        <div className={styles.posterMeta}>
          <span>{type === "MOVIE" ? "Movie" : "Series"}</span>
          <span>{String(transcodingStatus).toLowerCase()}</span>
        </div>
      </div>
      <div className={styles.copy}>
        <h2 className={styles.name}>{name}</h2>
      </div>
    </button>
  );
}
