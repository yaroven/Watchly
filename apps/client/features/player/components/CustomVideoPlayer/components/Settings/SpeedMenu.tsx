import Box from "@mui/material/Box";

import { usePlayerPlaybackRate } from "../../CustomVideoPlayerContext";
import { formatPlaybackRate } from "../../utils";

const menuOptionSx = {
  border: 0,
  background: "transparent",
  textAlign: "left",
  padding: "10px 16px",
  color: "rgba(255, 255, 255, 0.8)",
  cursor: "pointer",
  fontSize: "13.5px",
  fontWeight: 500,
  borderRadius: "8px",
  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
  whiteSpace: "nowrap",
  "&:hover": { background: "rgba(255, 255, 255, 0.08)", color: "#fff" },
  "&:focus-visible": { outline: "2px solid #e7bc0f", outlineOffset: "-2px" },
};

const menuOptionActiveSx = {
  color: "#e7bc0f",
  background: "rgba(231, 188, 15, 0.12)",
  fontWeight: 600,
};

export default function SpeedMenu() {
  const { value, options, set } = usePlayerPlaybackRate();

  return options.map((option) => {
    const isActive = value === option;

    return (
      <Box
        key={option}
        component="button"
        type="button"
        onClick={() => set(option)}
        aria-pressed={isActive}
        sx={[menuOptionSx, isActive && menuOptionActiveSx]}
      >
        {formatPlaybackRate(option)}
      </Box>
    );
  });
}
