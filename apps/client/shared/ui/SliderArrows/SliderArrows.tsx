"use client";

import { KeyboardArrowLeft as KeyboardArrowLeftIcon, KeyboardArrowRight as KeyboardArrowRightIcon } from "@mui/icons-material";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import type { SxProps, Theme } from "@mui/material/styles";
import { tokens } from "@shared/mui/theme";
import { useTranslations } from "next-intl";

export type SliderItemLabel = "item" | "title" | "story" | "episode";

interface SliderArrowsProps {
  onPrev: () => void;
  onNext: () => void;
  itemLabel?: SliderItemLabel;
  disablePrev?: boolean;
  disableNext?: boolean;
  size?: number;
  shape?: "circle" | "square";
  sx?: SxProps<Theme>;
}

export default function SliderArrows({
  onPrev,
  onNext,
  itemLabel = "item",
  disablePrev = false,
  disableNext = false,
  size = 21,
  shape = "circle",
  sx,
}: SliderArrowsProps) {
  const t = useTranslations("shared.sliderArrows");

  return (
    <Box sx={[{ display: "flex", alignItems: "center", gap: "24px" }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <IconButton onClick={onPrev} disabled={disablePrev} aria-label={t(`previous.${itemLabel}`)} sx={arrowButtonSx(-1, size, shape)}>
        <KeyboardArrowLeftIcon
          sx={{ fontSize: size * 0.85, color: shape === "square" && disablePrev ? "#666666" : tokens.surface.paper }}
        />
      </IconButton>
      <IconButton onClick={onNext} disabled={disableNext} aria-label={t(`next.${itemLabel}`)} sx={arrowButtonSx(1, size, shape)}>
        <KeyboardArrowRightIcon
          sx={{ fontSize: size * 0.85, color: shape === "square" && disableNext ? "#666666" : tokens.surface.paper }}
        />
      </IconButton>
    </Box>
  );
}

const arrowButtonSx = (dir: -1 | 1, size: number, shape: "circle" | "square") => ({
  backgroundColor: "primary.main",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: shape === "square" ? "10px" : "100%",
  width: `${size}px`,
  height: `${size}px`,
  transition: "transform .15s ease-out, background-color .15s ease-out",
  ":hover": { backgroundColor: "#f2c832", transform: `translateX(${dir * 2}px)` },
  ":active": { transform: "scale(0.94)" },
  ":disabled":
    shape === "square"
      ? { backgroundColor: tokens.surface.fill, opacity: 1, cursor: "not-allowed", transform: "none" }
      : { backgroundColor: "primary.main", opacity: 0.35, cursor: "not-allowed", transform: "none" },
  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
});
