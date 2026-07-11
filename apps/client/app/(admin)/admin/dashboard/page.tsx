"use client";

import useTitles from "@/features/title/api/use-titles";
import { TitleType } from "@/features/title/schemas/title";
import { Clapperboard, Film, Tv } from "lucide-react";
import QuickActions from "./componens/QuickActions";
import StatCard from "./componens/StatCard";
import styles from "./page.module.scss";

export default function Page() {
  const { data: allTitles } = useTitles({ limit: 1 });

  const { data: movies } = useTitles({ limit: 1, type: TitleType.MOVIE });

  const { data: series } = useTitles({ limit: 1, type: TitleType.SERIES });

  const stats = [
    {
      id: "titles",
      label: "Total Titles",
      value: allTitles?.totalCount || 0,
      icon: <Clapperboard size={24} />,
    },
    {
      id: "movies",
      label: "Movies",
      value: movies?.totalCount || 0,
      icon: <Film size={24} />,
    },
    {
      id: "series",
      label: "Series",
      value: series?.totalCount || 0,
      icon: <Tv size={24} />,
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div>
          <h1 className={styles.pageTitle}>Admin Overview</h1>
          <p className={styles.pageSubtitle}>Monitor your catalog, jump into common tasks, and keep the content pipeline moving.</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat) => (
          <StatCard key={stat.id} {...stat} />
        ))}
      </div>

      <div className={styles.dashboardGrid}>
        <QuickActions />
      </div>
    </div>
  );
}
