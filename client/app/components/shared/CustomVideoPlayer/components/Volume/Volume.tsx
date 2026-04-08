import { LucideProps, Volume1, Volume2, VolumeX } from "lucide-react";
import { ChangeEvent, useState } from "react";
import styles from "./Volume.module.scss";

interface VolumeProps {
  volume: number;
  onSeek: (e: ChangeEvent<HTMLInputElement>) => void;
  onToggle: () => void;
}

export default function Volume({ volume, onSeek, onToggle }: VolumeProps) {
  const [isOver, setIsOver] = useState(false);
  return (
    <div
      className={styles.volumeContainer}
      onMouseOver={() => setIsOver(true)}
      onMouseOut={() => setIsOver(false)}
    >
      {getVolumeIcon(volume, {
        onClick: onToggle,
        size: 32,
        className: styles.volumeIcon,
      })}
      <input
        className={`${isOver ? "" : styles.hidden}`}
        value={volume}
        min={0}
        step={0.05}
        max={1}
        onChange={onSeek}
        type="range"
      />
    </div>
  );
}

function getVolumeIcon(volume: number, props: LucideProps) {
  if (volume === 0) return <VolumeX {...props} />;
  if (volume > 0 && volume <= 0.5) return <Volume1 {...props} />;
  return <Volume2 {...props} />;
}
