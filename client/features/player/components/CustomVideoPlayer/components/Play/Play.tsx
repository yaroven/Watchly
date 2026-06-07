import { Pause, Play as PlayIcon } from "lucide-react";

import { usePlayerPlayback } from "../../CustomVideoPlayerContext";
import styles from "./Play.module.scss";

const ICON_SIZE = 32;

export default function Play() {
  const { isPlaying, toggle } = usePlayerPlayback();

  return (
    <button
      type="button"
      onClick={toggle}
      className={styles.playButton}
      style={{ width: ICON_SIZE, height: ICON_SIZE }}
      aria-label={isPlaying ? "Pause video" : "Play video"}
      title={isPlaying ? "Pause" : "Play"}
    >
      {isPlaying ? <Pause size={ICON_SIZE} /> : <PlayIcon size={ICON_SIZE} />}
    </button>
  );
}
