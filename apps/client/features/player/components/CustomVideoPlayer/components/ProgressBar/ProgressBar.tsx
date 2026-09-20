import Box from "@mui/material/Box";
import { CSSProperties, useState } from "react";

import { usePlayerPlayback, usePlayerTimeline } from "../../CustomVideoPlayerContext";

export default function ProgressBar() {
  const { current, duration, buffered } = usePlayerTimeline();
  const { seek } = usePlayerPlayback();
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  const safeMax = duration > 0 ? duration : 0;
  const displayTime = scrubTime ?? current;
  const playedPercentage = safeMax > 0 ? Math.min((displayTime / safeMax) * 100, 100) : 0;
  const bufferedPercentage = safeMax > 0 ? Math.min((buffered / safeMax) * 100, 100) : 0;

  const handleInput = (value: number) => {
    setScrubTime(value);
    seek(value);
  };

  const endScrub = () => setScrubTime(null);

  return (
    // CSS custom properties driven by played/buffered percentages are set via `style`
    // (not `sx`) so the .playedBar/.bufferedBar widths below can reference them with var(...)
    <Box
      style={
        {
          "--played": `${playedPercentage}%`,
          "--buffered": `${bufferedPercentage}%`,
        } as CSSProperties
      }
      sx={{
        position: "relative",
        width: "100%",
        height: "16px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          right: 0,
          top: "6px",
          height: "4px",
          background: "rgba(255, 255, 255, 0.16)",
          borderRadius: "2px",
          transition: "height 0.2s ease, top 0.2s ease",
        },
        "&:hover": {
          "&::before": { height: "6px", top: "5px" },
          "& .played-bar": { height: "6px", top: "5px" },
          "& .buffered-bar": { height: "6px", top: "5px" },
          "& .range-input::-webkit-slider-thumb": { transform: "scale(1)" },
          "& .range-input::-moz-range-thumb": { transform: "scale(1)" },
        },
      }}
    >
      <Box
        className="played-bar"
        sx={{
          position: "absolute",
          top: "6px",
          left: 0,
          height: "4px",
          pointerEvents: "none",
          borderRadius: "2px",
          transition: "height 0.2s ease, top 0.2s ease",
          width: "var(--played)",
          zIndex: 3,
          background: "#e7bc0f",
          boxShadow: "0 0 8px rgba(231, 188, 15, 0.55)",
        }}
      />
      <Box
        className="buffered-bar"
        sx={{
          position: "absolute",
          top: "6px",
          left: 0,
          height: "4px",
          pointerEvents: "none",
          borderRadius: "2px",
          transition: "height 0.2s ease, top 0.2s ease",
          width: "var(--buffered)",
          zIndex: 2,
          background: "rgba(255, 255, 255, 0.24)",
        }}
      />
      <Box
        component="input"
        type="range"
        min="0"
        step="any"
        max={safeMax}
        value={Math.min(displayTime, safeMax)}
        onInput={(event) => handleInput(parseFloat(event.currentTarget.value))}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
        className="range-input"
        aria-label="Seek video"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={displayTime}
        sx={{
          WebkitAppearance: "none",
          appearance: "none",
          width: "100%",
          height: "16px",
          background: "transparent",
          outline: "none",
          cursor: "pointer",
          zIndex: 5,
          position: "relative",
          "&::-webkit-slider-thumb": {
            WebkitAppearance: "none",
            height: "14px",
            width: "14px",
            borderRadius: "50%",
            background: "#e7bc0f",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
            cursor: "pointer",
            marginTop: "-5px",
            transform: "scale(0)",
            transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
          },
          "&::-webkit-slider-runnable-track": {
            width: "100%",
            height: "4px",
            cursor: "pointer",
            background: "transparent",
          },
          "&::-moz-range-thumb": {
            height: "14px",
            width: "14px",
            border: 0,
            borderRadius: "50%",
            background: "#e7bc0f",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
            cursor: "pointer",
            transform: "scale(0)",
            transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
          },
          "&::-moz-range-track": {
            height: "4px",
            background: "transparent",
          },
        }}
      />
    </Box>
  );
}
