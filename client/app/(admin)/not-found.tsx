import Link from "next/link";
import styles from "./not-found.module.scss";

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.codeBadge}>404</div>
        <div className={styles.textGroup}>
          <p className={styles.eyebrow}>Admin Panel</p>
          <h1 className={styles.title}>This admin page is missing</h1>
          <p className={styles.subtitle}>The panel could not find the resource you requested.</p>
          <p className={styles.description}>
            The record may have been deleted, the route may be incorrect, or the page may not exist
            in this admin section.
          </p>
        </div>
        <Link href="/admin/dashboard" className={styles.homeButton}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
