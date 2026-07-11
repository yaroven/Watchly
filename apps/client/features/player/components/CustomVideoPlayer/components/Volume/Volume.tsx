import { LucideProps, Volume1, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";

import { usePlayerVolume } from "../../CustomVideoPlayerContext";
import styles from "./Volume.module.scss";

export default function Volume() {
  const { value, isMuted, seek, toggleMute } = usePlayerVolume();
  const [isOver, setIsOver] = useState(false);
  const displayVolume = isMuted ? 0 : value;

  return (
    <div
      className={styles.volumeContainer}
      onMouseEnter={() => setIsOver(true)}
      onMouseLeave={() => setIsOver(false)}
      onFocus={() => setIsOver(true)}
      onBlur={() => setIsOver(false)}
    >
      <button
        type="button"
        className={styles.volumeButton}
        onClick={toggleMute}
        aria-label={displayVolume === 0 ? "Unmute video" : "Mute video"}
        title={displayVolume === 0 ? "Unmute" : "Mute"}
      >
        {getVolumeIcon(displayVolume, { size: 32, className: styles.volumeIcon })}
      </button>
      <input
        className={isOver ? undefined : styles.hidden}
        value={displayVolume}
        min={0}
        step={0.05}
        max={1}
        onChange={seek}
        type="range"
        aria-label="Volume"
      />
    </div>
  );
}

function getVolumeIcon(volume: number, props: LucideProps) {
  if (volume === 0) return <VolumeX {...props} />;
  if (volume <= 0.5) return <Volume1 {...props} />;
  return <Volume2 {...props} />;
}
