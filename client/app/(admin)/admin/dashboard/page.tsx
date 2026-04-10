"use client";

import { TitleService } from "@/app/services/title.service";
import { TitleType } from "@/app/types/title";
import { useQuery } from "@tanstack/react-query";
import { Clapperboard, Film, Tv } from "lucide-react";
import QuickActions from "./componens/QuickActions";
import StatCard from "./componens/StatCard";
import styles from "./page.module.scss";

export default function Page() {
  const { data: allTitles } = useQuery({
    queryKey: ["adminStats", "all"],
    queryFn: () => TitleService.getAll({ limit: 1 }),
  });

  const { data: movies } = useQuery({
    queryKey: ["adminStats", TitleType.MOVIE],
    queryFn: () => TitleService.getAll({ limit: 1, type: TitleType.MOVIE }),
  });

  const { data: series } = useQuery({
    queryKey: ["adminStats", TitleType.SERIES],
    queryFn: () => TitleService.getAll({ limit: 1, type: TitleType.SERIES }),
  });

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
      <div className={styles.statsGrid}>
        {stats.map((stat) => (
          <StatCard key={stat.id} {...stat} />
        ))}
      </div>

      <div className={styles.dashboardGrid}>
        {/* <RecentAdditions /> */}
        <QuickActions />
      </div>
    </div>
  );
}
