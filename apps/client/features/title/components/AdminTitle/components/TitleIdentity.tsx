"use client";

import { TitleType } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import { Clapperboard, Film } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import styles from "../Title.module.scss";

interface TitleIdentityProps {
  name: string;
  posterUrl?: string;
  to: string;
  type: TitleType;
}

export default function TitleIdentity({ name, posterUrl = "/cat.webp", to, type }: TitleIdentityProps) {
  const typeLabel = type === TitleType.MOVIE ? "Movie" : "Series";
  const posterSrc = getOptimizedImageSrc(posterUrl);

  return (
    <div className={styles.mainCell}>
      <Link href={to} className={styles.posterConteiner}>
        <Image className={styles.poster} src={posterSrc} alt={name} width={72} height={108} />
      </Link>

      <div className={styles.details}>
        <Link href={to} className={styles.name}>
          {name}
        </Link>

        <div className={styles.meta}>
          <span className={styles.kind}>
            {type === TitleType.MOVIE ? <Film size={14} /> : <Clapperboard size={14} />}
            {typeLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
