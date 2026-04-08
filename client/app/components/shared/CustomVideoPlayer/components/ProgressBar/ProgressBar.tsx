import { ChangeEvent } from "react";
import styles from "./ProgressBar.module.scss";

interface ProgressBarProps {
  max: number;
  value: number;
  buffered: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function ProgressBar({ max, value, buffered, onChange }: ProgressBarProps) {
  const bufferedPercentage = max > 0 ? (buffered / max) * 100 : 0;
  
  return (
    <div className={styles.progressWrapper}>
      <div 
        className={styles.bufferedBar} 
        style={{ width: `${bufferedPercentage}%` }} 
      />
      <input
        type="range"
        min="0"
        step={0.5}
        max={max}
        value={value}
        onChange={onChange}
        className={styles.rangeInput}
      />
    </div>
  );
}
