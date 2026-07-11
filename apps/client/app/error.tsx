"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import styles from "./error.module.scss";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.errorContainer}>
      <div className={styles.content}>
        <div className={styles.codeBadge}>Error</div>
        <div className={styles.iconWrapper}>
          <AlertCircle size={56} />
        </div>
        <div className={styles.textGroup}>
          <p className={styles.eyebrow}>Watchly</p>
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.description}>
            We hit an unexpected problem while loading this screen. Try again, or head back to a safe route while the system recovers.
          </p>
        </div>
        <div className={styles.actions}>
          <button onClick={() => reset()} className={styles.resetButton}>
            Try Again
          </button>
          <Link href="/" className={styles.homeButton}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
