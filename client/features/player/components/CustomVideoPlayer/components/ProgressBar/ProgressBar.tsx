import { CSSProperties, ChangeEvent } from "react";
import styles from "./ProgressBar.module.scss";

interface ProgressBarProps {
  max: number;
  value: number;
  buffered: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function ProgressBar({ max, value, buffered, onChange }: ProgressBarProps) {
  const safeMax = max > 0 ? max : 0;
  const playedPercentage = safeMax > 0 ? Math.min((value / safeMax) * 100, 100) : 0;
  const bufferedPercentage = safeMax > 0 ? Math.min((buffered / safeMax) * 100, 100) : 0;

  return (
    <div
      className={styles.progressWrapper}
      style={
        {
          "--played": `${playedPercentage}%`,
          "--buffered": `${bufferedPercentage}%`,
        } as CSSProperties
      }
    >
      <div className={styles.playedBar} />
      <div className={styles.bufferedBar} />
      <input
        type="range"
        min="0"
        step={0.5}
        max={safeMax}
        value={Math.min(value, safeMax)}
        onChange={onChange}
        className={styles.rangeInput}
        aria-label="Seek video"
      />
    </div>
  );
}
