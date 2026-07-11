import { MouseEvent } from "react";

import styles from "../../CustomVideoPlayer.module.scss";

interface VideoTapZonesProps {
  onTap: () => void;
  onSkip: (seconds: number) => void;
  onFullscreen: () => void;
}

type TapZone = { className: string; type: "skip"; offset: number } | { className: string; type: "fullscreen" };

const TAP_ZONES: TapZone[] = [
  { className: styles.dcLeft, type: "skip", offset: -10 },
  { className: styles.dcCenter, type: "fullscreen" },
  { className: styles.dcRight, type: "skip", offset: 10 },
];

export default function VideoTapZones({ onTap, onSkip, onFullscreen }: VideoTapZonesProps) {
  const handleDoubleClick = (event: MouseEvent, zone: TapZone) => {
    event.stopPropagation();

    if (zone.type === "fullscreen") {
      onFullscreen();
      return;
    }

    onSkip(zone.offset);
  };

  return (
    <div className={styles.doubleClickLayer}>
      {TAP_ZONES.map((zone) => (
        <div key={zone.className} className={zone.className} onClick={onTap} onDoubleClick={(event) => handleDoubleClick(event, zone)} />
      ))}
    </div>
  );
}
