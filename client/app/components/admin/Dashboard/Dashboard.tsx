"use client";

import { TitleService } from "@/app/services/title.service";
import { TitleType } from "@/app/types/title";
import { useQuery } from "@tanstack/react-query";
import { Clapperboard, Film, LayoutDashboard, PlusCircle, Settings, Tv } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./Dashboard.module.scss";

export default function Dashboard() {
  const router = useRouter();

  // Fetch Stats
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

  // Fetch Recent Additions
  const { data: recentTitles } = useQuery({
    queryKey: ["adminRecent", 1],
    queryFn: () => TitleService.getAll({ limit: 5, page: 1 }),
  });

  const stats = [
    {
      label: "Total Titles",
      value: allTitles?.totalCount || 0,
      icon: <Clapperboard size={24} />,
    },
    {
      label: "Movies",
      value: movies?.totalCount || 0,
      icon: <Film size={24} />,
    },
    {
      label: "Series",
      value: series?.totalCount || 0,
      icon: <Tv size={24} />,
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <div className={styles.statIcon}>{stat.icon}</div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>{stat.label}</span>
              <span className={styles.statValue}>{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.dashboardGrid}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Recent Additions</h2>
          <div className={styles.recentList}>
            {recentTitles?.items.length ? (
              recentTitles.items.map((title) => (
                <div
                  key={title.id}
                  className={styles.recentItem}
                  onClick={() => router.push(`/admin/titles/${title.id}`)}
                >
                  <div className={styles.itemInfo}>
                    <span className={styles.itemType}>{title.type}</span>
                    <span className={styles.itemName}>{title.name}</span>
                  </div>
                  <span className={styles.itemDate}>
                    {new Date(title.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className={styles.noData}>No recent titles found.</p>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
          <div className={styles.quickActions}>
            <button
              className={styles.actionButton}
              onClick={() => router.push("/admin/titles/new")}
            >
              <PlusCircle size={20} />
              Add New Title
            </button>
            <button className={styles.actionButton} onClick={() => router.push("/admin/titles")}>
              <Settings size={20} />
              Manage All Titles
            </button>
            <button className={styles.actionButton} onClick={() => router.push("/admin")}>
              <LayoutDashboard size={20} />
              Overview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
