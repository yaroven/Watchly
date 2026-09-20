import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import Box from "@mui/material/Box";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import { useState } from "react";

import { usePlayerVolume } from "../../CustomVideoPlayerContext";

const volumeIconSx = {
  fontSize: 32,
  transition: "all ease-in-out 0.1s",
  "&:hover": { transform: "scale(1.1)" },
};

export default function Volume() {
  const { value, isMuted, seek, toggleMute } = usePlayerVolume();
  const [isOver, setIsOver] = useState(false);
  const displayVolume = isMuted ? 0 : value;

  return (
    <Box
      sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}
      onMouseEnter={() => setIsOver(true)}
      onMouseLeave={() => setIsOver(false)}
      onFocus={() => setIsOver(true)}
      onBlur={() => setIsOver(false)}
    >
      <Box
        component="button"
        type="button"
        onClick={toggleMute}
        aria-label={displayVolume === 0 ? "Unmute video" : "Mute video"}
        title={displayVolume === 0 ? "Unmute" : "Mute"}
        sx={{
          all: "unset",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          cursor: "pointer",
          "&:focus-visible": { outline: "2px solid #fff", outlineOffset: "3px", borderRadius: "4px" },
        }}
      >
        {getVolumeIcon(displayVolume, { sx: volumeIconSx })}
      </Box>
      <Box
        component="input"
        value={displayVolume}
        min={0}
        step={0.05}
        max={1}
        onChange={seek}
        type="range"
        aria-label="Volume"
        sx={[
          { width: "86px", accentColor: "#fff", transition: "width 0.16s ease, opacity 0.16s ease" },
          !isOver && { width: 0, opacity: 0, pointerEvents: "none" },
        ]}
      />
    </Box>
  );
}

function getVolumeIcon(volume: number, props: SvgIconProps) {
  if (volume === 0) return <VolumeOffIcon {...props} />;
  if (volume <= 0.5) return <VolumeDownIcon {...props} />;
  return <VolumeUpIcon {...props} />;
}
