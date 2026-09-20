import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import Box from "@mui/material/Box";

import { usePlayerFullscreen } from "../../CustomVideoPlayerContext";

export default function Fullscreen() {
  const { active, toggle } = usePlayerFullscreen();

  return (
    <Box
      component="button"
      type="button"
      onClick={toggle}
      aria-label={active ? "Exit fullscreen" : "Enter fullscreen"}
      title={active ? "Exit fullscreen" : "Fullscreen"}
      sx={{
        all: "unset",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "24px",
        height: "24px",
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
      {active ? <FullscreenExitIcon /> : <FullscreenIcon />}
    </Box>
  );
}
