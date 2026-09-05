"use client";

import { KeyboardArrowLeft as KeyboardArrowLeftIcon, KeyboardArrowRight as KeyboardArrowRightIcon } from "@mui/icons-material";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import type { SxProps, Theme } from "@mui/material/styles";

interface SliderArrowsProps {
  onPrev: () => void;
  onNext: () => void;
  /** Announced to screen readers, e.g. "title" gives "Previous title". */
  itemLabel?: string;
  disablePrev?: boolean;
  disableNext?: boolean;
  size?: number;
  sx?: SxProps<Theme>;
}

/** Paired prev/next controls shared by the hero and news sliders. */
export default function SliderArrows({
  onPrev,
  onNext,
  itemLabel = "item",
  disablePrev = false,
  disableNext = false,
  size = 21,
  sx,
}: SliderArrowsProps) {
  return (
    <Box sx={[{ display: "flex", alignItems: "center", gap: "24px" }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <IconButton onClick={onPrev} disabled={disablePrev} aria-label={`Previous ${itemLabel}`} sx={arrowButtonSx(-1, size)}>
        <KeyboardArrowLeftIcon sx={{ fontSize: size * 0.85, color: "#000000" }} />
      </IconButton>
      <IconButton onClick={onNext} disabled={disableNext} aria-label={`Next ${itemLabel}`} sx={arrowButtonSx(1, size)}>
        <KeyboardArrowRightIcon sx={{ fontSize: size * 0.85, color: "#000000" }} />
      </IconButton>
    </Box>
  );
}

const arrowButtonSx = (dir: -1 | 1, size: number) => ({
  backgroundColor: "primary.main",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: "100%",
  width: `${size}px`,
  height: `${size}px`,
  transition: "transform .15s ease-out, background-color .15s ease-out",
  // Nudging toward the arrow's own direction hints at where the content goes.
  ":hover": { backgroundColor: "#f2c832", transform: `translateX(${dir * 2}px)` },
  ":active": { transform: "scale(0.94)" },
  // Dimmed rather than hidden, so the row keeps its width at either end.
  ":disabled": {
    backgroundColor: "primary.main",
    opacity: 0.35,
    cursor: "not-allowed",
    transform: "none",
  },
  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
});
