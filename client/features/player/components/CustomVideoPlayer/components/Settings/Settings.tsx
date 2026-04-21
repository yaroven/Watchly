import { Settings as SettingsIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCustomVideoPlayer } from "../../CustomVideoPlayerContext";
import styles from "./Settings.module.scss";

export default function Settings() {
  const { quality, setQuality, qualities } = useCustomVideoPlayer();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={styles.settingsContainer}>
      <button
        type="button"
        className={styles.settingsButton}
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-label="Video quality settings"
      >
        <SettingsIcon className={styles.settingsIcon} />
      </button>
      {isOpen && (
        <div className={styles.settingsPopup}>
          {qualities.length > 0 ? (
            qualities.map((option) => (
              <button
                key={option.level}
                type="button"
                className={`${styles.qualityOption} ${quality === option.level ? styles.active : ""}`}
                onClick={() => {
                  setQuality(option.level);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className={styles.qualityOption}>Auto</div>
          )}
        </div>
      )}
    </div>
  );
}
