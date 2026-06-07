import { CSSProperties, useState } from "react";

import { usePlayerPlayback, usePlayerTimeline } from "../../CustomVideoPlayerContext";
import styles from "./ProgressBar.module.scss";

export default function ProgressBar() {
  const { current, duration, buffered } = usePlayerTimeline();
  const { seek } = usePlayerPlayback();
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  const safeMax = duration > 0 ? duration : 0;
  const displayTime = scrubTime ?? current;
  const playedPercentage = safeMax > 0 ? Math.min((displayTime / safeMax) * 100, 100) : 0;
  const bufferedPercentage = safeMax > 0 ? Math.min((buffered / safeMax) * 100, 100) : 0;

  const handleInput = (value: number) => {
    setScrubTime(value);
    seek(value);
  };

  const endScrub = () => setScrubTime(null);

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
        step="any"
        max={safeMax}
        value={Math.min(displayTime, safeMax)}
        onInput={(event) => handleInput(parseFloat(event.currentTarget.value))}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
        className={styles.rangeInput}
        aria-label="Seek video"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={displayTime}
      />
    </div>
  );
}
