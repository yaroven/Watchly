"use client";
import { ADMIN } from "@/app/constants/routes";
import { TitleService } from "@/app/services/title.service";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import styles from "./RecentAdditions.module.scss";

export default function RecentAdditions() {
  const router = useRouter();

  const { data: recentTitles } = useQuery({
    queryKey: ["adminRecent", 1],
    queryFn: () => TitleService.getAll({ limit: 5, page: 1 }),
  });

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Recent Additions</h2>
      <div className={styles.recentList}>
        {recentTitles?.items.length ? (
          recentTitles.items.map(({ id, type, name, createdAt }) => (
            <div
              key={id}
              className={styles.recentItem}
              onClick={() => router.push(ADMIN.TITLES_EDIT(id))}
            >
              <div className={styles.itemInfo}>
                <span className={styles.itemType}>{type}</span>
                <span className={styles.itemName}>{name}</span>
              </div>
              <span className={styles.itemDate}>{new Date(createdAt).toLocaleDateString()}</span>
            </div>
          ))
        ) : (
          <p className={styles.noData}>No recent titles found.</p>
        )}
      </div>
    </div>
  );
}
