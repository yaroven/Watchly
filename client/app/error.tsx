"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import styles from "./error.module.scss";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.errorContainer}>
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <AlertCircle size={64} />
        </div>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.description}>
          We encountered an unexpected error while trying to play your content. The projection booth
          is working on it, but meanwhile you can try to refresh or head back home.
        </p>
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
