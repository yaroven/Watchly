import Link from "next/link";
import styles from "./not-found.module.scss";

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.codeBadge}>404</div>
        <div className={styles.textGroup}>
          <p className={styles.eyebrow}>Watchly</p>
          <h1 className={styles.title}>This scene does not exist</h1>
          <p className={styles.subtitle}>The page you are looking for could not be found.</p>
          <p className={styles.description}>
            The link may be outdated, the content may have been removed, or the URL may be wrong.
            Let&apos;s get you back to something that actually streams.
          </p>
        </div>
        <Link href="/" className={styles.homeButton}>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
