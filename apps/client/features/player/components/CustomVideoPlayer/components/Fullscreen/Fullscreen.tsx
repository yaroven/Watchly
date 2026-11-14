import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import Box from "@mui/material/Box";
import { useTranslations } from "next-intl";

import { usePlayerFullscreen } from "../../CustomVideoPlayerContext";

export default function Fullscreen() {
  const t = useTranslations("player");
  const { active, toggle } = usePlayerFullscreen();

  return (
    <Box
      component="button"
      type="button"
      onClick={toggle}
      aria-label={active ? t("exitFullscreen") : t("enterFullscreen")}
      title={active ? t("exitFullscreen") : t("fullscreen")}
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
