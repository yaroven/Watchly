import Box from "@mui/material/Box";
import { MouseEvent } from "react";

interface VideoTapZonesProps {
  onTap: () => void;
  onSkip: (seconds: number) => void;
  onFullscreen: () => void;
}

type TapZone = { key: string; width: string; type: "skip"; offset: number } | { key: string; width: string; type: "fullscreen" };

const TAP_ZONES: TapZone[] = [
  { key: "left", width: "30%", type: "skip", offset: -10 },
  { key: "center", width: "40%", type: "fullscreen" },
  { key: "right", width: "30%", type: "skip", offset: 10 },
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
    <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 5, display: "flex" }}>
      {TAP_ZONES.map((zone) => (
        <Box
          key={zone.key}
          sx={{ height: "100%", width: zone.width }}
          onClick={onTap}
          onDoubleClick={(event) => handleDoubleClick(event, zone)}
        />
      ))}
    </Box>
  );
}
