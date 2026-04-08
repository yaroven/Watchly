import itemStyles from "../Title/Title.module.scss";
import styles from "../TitleList/TitleList.module.scss";
import Skeleton from "./Skeleton";

export default function CatalogSkeleton() {
  const items = Array.from({ length: 12 });

  return (
    <div className={styles.titleContainer}>
      {items.map((_, i) => (
        <div key={i} className={itemStyles.title}>
          <Skeleton width={150} height={225} borderRadius="0px" />
        </div>
      ))}
    </div>
  );
}
