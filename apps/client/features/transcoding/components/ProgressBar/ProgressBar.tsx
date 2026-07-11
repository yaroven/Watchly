import styles from "./ProgressBar.module.scss";

interface ProgressBarProps {
  bgColor?: string;
  progress: number;
}

export default function ProgressBar({ bgColor, progress }: ProgressBarProps) {
  return (
    <div className={styles.progressBar}>
      <div className={styles.filler} style={{ width: `${progress}%`, backgroundColor: bgColor || "#ca563f" }}>
        <span className={styles.label}>{progress}%</span>
      </div>
    </div>
  );
}
