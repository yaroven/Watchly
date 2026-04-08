import Loader from "./components/ui/Loader";
import styles from "./loading.module.scss";

export default function Loading() {
  return (
    <div className={styles.pageLoader}>
      <div className={styles.loader}>
        <Loader />
      </div>
    </div>
  );
}
