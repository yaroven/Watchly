"use client";

import { type Title } from "@/app/types/title";
import Image from "next/image";
import styles from "./Title.module.scss";

interface TitleProps extends Title {
  onClick: () => void;
}

export default function Title({ name, posterUrl = "/cat.webp", onClick }: TitleProps) {
  return (
    <div onClick={() => onClick()} className={styles.title}>
      <div className={styles.posterConteiner}>
        <Image
          className={styles.poster}
          src={posterUrl || "/cat.webp"}
          alt={name}
          width={150}
          height={225}
          unoptimized={!!posterUrl}
        />
        <div className={styles.posterBlackout}></div>
        <div className={styles.posterOverlay}></div>
      </div>
      <h1 className={styles.name}>{name}</h1>
    </div>
  );
}
