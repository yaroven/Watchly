import { Skeleton } from "@/shared/ui/Skeleton";
import styles from "./EpisodeList.module.scss";

export default function EpisodeListSkeleton() {
  return (
    <div className={styles.episodeList}>
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} width={50} height={50} borderRadius="12px" />
      ))}
    </div>
  );
}
