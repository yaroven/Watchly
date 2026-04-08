"use client";

import { type Title } from "@/app/types/title";

import Image from "next/image";
import Link from "next/link";
import styles from "./Title.module.scss";

interface TitleProps extends Title {
  to: string;
}

export default function Title({
  name,
  posterUrl = "/cat.webp",
  transcodingStatus,
  to,
}: TitleProps) {
  return (
    <div className={styles.title}>
      <Link href={to} className={styles.posterConteiner}>
        <Image
          className={styles.poster}
          src={posterUrl}
          alt={name}
          width={150}
          height={225}
          unoptimized={!!posterUrl}
        />
        <div
          className={`${styles.transcodingBadge} ${styles[transcodingStatus.toLocaleLowerCase()]}`}
        >
          {transcodingStatus.charAt(0).toUpperCase() +
            transcodingStatus.toLocaleLowerCase().slice(1)}
        </div>
      </Link>
      <Link href={to} className={styles.name}>
        {name}
      </Link>
    </div>
  );
}
