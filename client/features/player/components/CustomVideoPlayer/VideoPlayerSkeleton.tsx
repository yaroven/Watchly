import styles from "./CustomVideoPlayer.module.scss";

export default function VideoPlayerSkeleton() {
  return (
    <div className={`${styles.videoPlayerContainer} ${styles.isLoading}`}>
      <div className={styles.loader} style={{ opacity: 0.5 }}>
        {/* Placeholder for the loader icon if needed, but the shimmer should suffice */}
      </div>
    </div>
  );
}
