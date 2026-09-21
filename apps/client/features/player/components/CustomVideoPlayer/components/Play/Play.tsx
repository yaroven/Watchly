import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Box from "@mui/material/Box";

import { usePlayerPlayback } from "../../CustomVideoPlayerContext";

const ICON_SIZE = 32;

export default function Play() {
  const { isPlaying, toggle } = usePlayerPlayback();

  return (
    <Box
      component="button"
      type="button"
      onClick={toggle}
      style={{ width: ICON_SIZE, height: ICON_SIZE }}
      aria-label={isPlaying ? "Pause video" : "Play video"}
      title={isPlaying ? "Pause" : "Play"}
      sx={{
        all: "unset",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        color: "#fff",
        cursor: "pointer",
        margin: 0,
        padding: 0,
        transition: "all ease-in-out 0.1s",
        "&:hover": { transform: "scale(1.1)" },
        "&:focus-visible": { outline: "2px solid #fff", outlineOffset: "3px", borderRadius: "4px" },
      }}
    >
      {isPlaying ? <PauseIcon sx={{ fontSize: ICON_SIZE }} /> : <PlayArrowIcon sx={{ fontSize: ICON_SIZE }} />}
    </Box>
  );
}
