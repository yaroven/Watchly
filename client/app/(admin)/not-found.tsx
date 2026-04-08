import Link from "next/link";
import styles from "./not-found.module.scss";

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.textGroup}>
          <h1 className={styles.title}>404</h1>
          <p className={styles.subtitle}>Lost in the Shadows?</p>
          <p className={styles.description}>
            It seems the projector broke or the film was never loaded. The page you are looking for
            doesn&apos;t exist in this theater.
          </p>
        </div>
        <Link href="/admin/dashboard" className={styles.homeButton}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
