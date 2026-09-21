import AutorenewIcon from "@mui/icons-material/Autorenew";
import Box from "@mui/material/Box";

import { usePlayerPlayback, usePlayerTimeline, usePlayerUI } from "../../CustomVideoPlayerContext";
import { formatPlayerTime } from "../../utils";
import Fullscreen from "../Fullscreen";
import Play from "../Play";
import ProgressBar from "../ProgressBar";
import Settings from "../Settings";
import Volume from "../Volume";

export default function PlayerControls() {
  const { current, duration } = usePlayerTimeline();
  const { isBuffering } = usePlayerPlayback();
  const { controlsVisible } = usePlayerUI();

  return (
    <Box
      sx={[
        {
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: { xs: "8px", sm: "10px" },
          padding: { xs: "14px 12px", sm: "20px" },
          boxSizing: "border-box",
          color: "#fff",
          background: "linear-gradient(to top, rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.32) 72%, transparent)",
          transition: "opacity 0.2s ease-in-out",
        },
        !controlsVisible && { opacity: 0, pointerEvents: "none" },
      ]}
    >
      <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            paddingLeft: "4px",
            fontSize: "13px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {isBuffering && (
            <AutorenewIcon
              sx={{
                fontSize: 14,
                flexShrink: 0,
                opacity: 0.9,
                animation: "spin 1s linear infinite",
                "@keyframes spin": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
              }}
              aria-label="Buffering"
            />
          )}
          {formatPlayerTime(current)} / {formatPlayerTime(duration)}
        </Box>
        <ProgressBar />
      </Box>
      <Box sx={{ width: "100%", display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", flexDirection: "row", gap: "8px", alignItems: "center" }}>
          <Play />
          <Volume />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: "10px", sm: "16px" } }}>
          <Settings />
          <Fullscreen />
        </Box>
      </Box>
    </Box>
  );
}
