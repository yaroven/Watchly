import { Skeleton } from "@/shared/ui/Skeleton";
import styles from "./SeasonTabs.module.scss";

export default function SeasonTabsSkeleton() {
  return (
    <div className={styles.tabs} style={{ gap: "10px", marginTop: "10px" }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} width={100} height={40} borderRadius="8px" />
      ))}
    </div>
  );
}
