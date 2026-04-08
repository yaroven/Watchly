"use client";

import { TitleService } from "@/app/services/title.service";
import { Title } from "@/app/types/title";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Skeleton } from "../Skeleton";
import styles from "./TitleInfo.module.scss";

interface TitleInfoProps {
  id: string;
  initialData?: Title;
}

export default function TitleInfo({ id, initialData }: TitleInfoProps) {
  const { data, error } = useQuery<Title>({
    queryKey: ["movieInfo", id],
    queryFn: () => TitleService.getById(id),
    initialData,
  });

  if (error || !data) return notFound();

  const { name, description, posterUrl } = data;

  const infoData = [
    { label: "Якість:", value: "1080p", isLink: false },
    { label: "Рік виходу:", value: "2026", isLink: true },
    { label: "Країна:", value: "Японія", isLink: true },
    { label: "Жанр:", value: "Аніме, Багатосерійне аніме", isLink: true },
    { label: "Режисер:", value: "Нобухару Каманака", isLink: true },
    { label: "Актори:", value: "Такая Курода, Масакадзу Моріта, Хонока Іное...", isLink: true },
  ];

  return (
    <div className={styles.titleInfoContainer}>
      <div className={styles.posterContainer}>
        <Image src={posterUrl || "/cat.webp"} alt={name} width={250} height={400} priority />
      </div>
      <div className={styles.titleInfo}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <h2>{name}</h2>
          </div>
        </div>

        <div className={styles.infoList}>
          {infoData.map((item, index) => (
            <div key={index} className={styles.row}>
              <span className={styles.label}>{item.label} </span>
              <span className={`${styles.value} ${item.isLink ? styles.link : ""}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.description}>{description}</div>
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
