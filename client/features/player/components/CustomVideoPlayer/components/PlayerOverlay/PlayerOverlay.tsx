import { LoaderCircle, PlayIcon } from "lucide-react";

import styles from "../../CustomVideoPlayer.module.scss";

interface PlayerOverlayProps {
  isPlaying: boolean;
  isInitialLoading: boolean;
  errorMessage: string | null;
  onPlay: () => void;
}

export default function PlayerOverlay({
  isPlaying,
  isInitialLoading,
  errorMessage,
  onPlay,
}: PlayerOverlayProps) {
  if (errorMessage) return <div className={styles.errorMessage}>{errorMessage}</div>;

  if (isInitialLoading) return <LoaderCircle className={styles.loader} size={64} />;

  if (isPlaying) return null;

  return (
    <button type="button" onClick={onPlay} className={styles.centerPlayButton} aria-label="Play video">
      <PlayIcon size={64} />
    </button>
  );
}
