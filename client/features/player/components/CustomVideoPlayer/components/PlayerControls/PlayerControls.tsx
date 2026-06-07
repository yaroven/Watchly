import { LoaderCircle } from "lucide-react";

import { usePlayerPlayback, usePlayerTimeline, usePlayerUI } from "../../CustomVideoPlayerContext";
import { formatPlayerTime } from "../../utils";
import Fullscreen from "../Fullscreen";
import Play from "../Play";
import ProgressBar from "../ProgressBar";
import Settings from "../Settings";
import Volume from "../Volume";
import styles from "./PlayerControls.module.scss";

export default function PlayerControls() {
  const { current, duration } = usePlayerTimeline();
  const { isBuffering } = usePlayerPlayback();
  const { controlsVisible } = usePlayerUI();

  return (
    <div className={`${styles.controlBar} ${!controlsVisible ? styles.hidden : ""}`}>
      <div className={styles.topPart}>
        <div className={styles.timeline}>
          {isBuffering && (
            <LoaderCircle className={styles.bufferingIcon} size={14} aria-label="Buffering" />
          )}
          {formatPlayerTime(current)} / {formatPlayerTime(duration)}
        </div>
        <ProgressBar />
      </div>
      <div className={styles.bottomPart}>
        <div className={styles.playAndVolume}>
          <Play />
          <Volume />
        </div>
        <div className={styles.rightControls}>
          <Settings />
          <Fullscreen />
        </div>
      </div>
    </div>
  );
}
