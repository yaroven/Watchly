import { useCustomVideoPlayer } from "../../CustomVideoPlayerContext";
import { formatPlayerTime } from "../../utils";
import Fullscreen from "../Fullscreen";
import Play from "../Play";
import ProgressBar from "../ProgressBar";
import Settings from "../Settings";
import Volume from "../Volume";
import styles from "./PlayerControls.module.scss";

export default function PlayerControls() {
  const {
    isPlaying,
    timeline,
    duration,
    volumeValue,
    isMuted,
    isFullscreen,
    onPlayToggle,
    onSeek,
    onVolumeSeek,
    onMuteToggle,
    onFullscreenToggle,
    areControlsVisible,
    buffered,
  } = useCustomVideoPlayer();
  return (
    <div className={`${styles.controlBar} ${!areControlsVisible ? styles.hidden : ""}`}>
      <div className={styles.topPart}>
        <div className={styles.timeline}>{formatPlayerTime(timeline)}</div>
        <ProgressBar
          max={duration}
          value={timeline}
          buffered={buffered}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
        />
      </div>
      <div className={styles.bottomPart}>
        <div className={styles.playAndVolume}>
          <Play isPlaying={isPlaying} onToggle={onPlayToggle} size={32} />
          <Volume
            onSeek={onVolumeSeek}
            volume={isMuted ? 0 : volumeValue}
            onToggle={onMuteToggle}
          />
        </div>
        <div className={styles.rightControls}>
          <Settings />
          <Fullscreen isFullscreen={isFullscreen} onClick={onFullscreenToggle} />
        </div>
      </div>
    </div>
  );
}
