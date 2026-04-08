import { Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { useCustomVideoPlayer } from "../../CustomVideoPlayerContext";
import styles from "./Settings.module.scss";

export default function Settings() {
  const { quality, setQuality, qualities } = useCustomVideoPlayer();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.settingsContainer}>
      <SettingsIcon className={styles.settingsIcon} onClick={() => setIsOpen(!isOpen)} />
      {isOpen && (
        <div className={styles.settingsPopup}>
          {qualities.length > 0 ? (
            qualities.map((q) => (
              <div
                key={q.level}
                className={`${styles.qualityOption} ${quality === q.level ? styles.active : ""}`}
                onClick={() => {
                  setQuality(q.level);
                  setIsOpen(false);
                }}
              >
                {q.label}
              </div>
            ))
          ) : (
            <div className={styles.qualityOption}>Auto</div>
          )}
        </div>
      )}
    </div>
  );
}
