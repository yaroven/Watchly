"use client";

import { Box } from "@mui/material";
import { SxProps, Theme } from "@mui/material/styles";
import { useEffect, useId, useRef, useState } from "react";

export type CornerPosition = "top left" | "top right" | "bottom left" | "bottom right";

interface InvertedCornerBoxProps {
  corners?: CornerPosition[];
  omitBorderSide?: "left" | "right";
  sx?: SxProps<Theme>;
  children?: React.ReactNode;
}

export default function InvertedCornerBox({
  corners = ["top left", "top right", "bottom left", "bottom right"],
  omitBorderSide,
  sx,
  children,
  ...props
}: InvertedCornerBoxProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const clipId = `inverted-corner-${useId()}`;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const borderBoxSize = entry.borderBoxSize?.[0];
      const width = borderBoxSize ? borderBoxSize.inlineSize : element.offsetWidth;
      const height = borderBoxSize ? borderBoxSize.blockSize : element.offsetHeight;
      setSize({ width, height });
    });
    observer.observe(element, { box: "border-box" });
    return () => observer.disconnect();
  }, []);

  const rawRadius = (sx as React.CSSProperties)?.borderRadius;
  const r = typeof rawRadius === "number" ? rawRadius : parseInt(String(rawRadius), 10) || 40;

  const rawBorder = (sx as React.CSSProperties)?.border;
  const borderMatch = typeof rawBorder === "string" ? rawBorder.match(/^(\d+(?:\.\d+)?)px\s+\S+\s+(.+)$/) : null;
  const borderWidth = borderMatch ? Number(borderMatch[1]) : 0;
  const borderColor = borderMatch ? borderMatch[2] : undefined;

  const hasTL = corners.includes("top left");
  const hasTR = corners.includes("top right");
  const hasBR = corners.includes("bottom right");
  const hasBL = corners.includes("bottom left");

  const isMeasured = size.width > 0 && size.height > 0;
  const rx = isMeasured ? r / size.width : 0;
  const ry = isMeasured ? r / size.height : 0;

  const pathData = [
    `M ${hasTL ? rx : 0} 0`,
    `H ${1 - (hasTR ? rx : 0)}`,
    hasTR ? `A ${rx} ${ry} 0 0 0 1 ${ry}` : "L 1 0",
    `V ${1 - (hasBR ? ry : 0)}`,
    hasBR ? `A ${rx} ${ry} 0 0 0 ${1 - rx} 1` : "L 1 1",
    `H ${hasBL ? rx : 0}`,
    hasBL ? `A ${rx} ${ry} 0 0 0 0 ${1 - ry}` : "L 0 1",
    `V ${hasTL ? ry : 0}`,
    hasTL ? `A ${rx} ${ry} 0 0 0 ${rx} 0` : "L 0 0",
    "Z",
  ].join(" ");

  const borderPathData =
    omitBorderSide === "right"
      ? [
          `M 1 ${1 - (hasBR ? ry : 0)}`,
          hasBR ? `A ${rx} ${ry} 0 0 0 ${1 - rx} 1` : `L ${1 - rx} 1`,
          `H ${hasBL ? rx : 0}`,
          hasBL ? `A ${rx} ${ry} 0 0 0 0 ${1 - ry}` : "L 0 1",
          `V ${hasTL ? ry : 0}`,
          hasTL ? `A ${rx} ${ry} 0 0 0 ${rx} 0` : "L 0 0",
          `H ${1 - (hasTR ? rx : 0)}`,
          hasTR ? `A ${rx} ${ry} 0 0 0 1 ${ry}` : "L 1 0",
        ].join(" ")
      : omitBorderSide === "left"
        ? [
            `M 0 ${hasTL ? ry : 0}`,
            hasTL ? `A ${rx} ${ry} 0 0 0 ${rx} 0` : `L ${rx} 0`,
            `H ${1 - (hasTR ? rx : 0)}`,
            hasTR ? `A ${rx} ${ry} 0 0 0 1 ${ry}` : "L 1 0",
            `V ${1 - (hasBR ? ry : 0)}`,
            hasBR ? `A ${rx} ${ry} 0 0 0 ${1 - rx} 1` : "L 1 1",
            `H ${hasBL ? rx : 0}`,
            hasBL ? `A ${rx} ${ry} 0 0 0 0 ${1 - ry}` : "L 0 1",
          ].join(" ")
        : pathData;

  return (
    <Box
      ref={elementRef}
      sx={{
        ...sx,
        position: "relative",
        borderRadius: 0,
        border: 0,
        clipPath: isMeasured ? `url(#${clipId})` : undefined,
      }}
      {...props}
    >
      {isMeasured && (
        <>
          <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
            <defs>
              <clipPath id={clipId} clipPathUnits="objectBoundingBox">
                <path d={pathData} />
              </clipPath>
            </defs>
          </svg>

          {borderColor && (
            <Box
              component="svg"
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}
              aria-hidden="true"
            >
              <path d={borderPathData} fill="none" stroke={borderColor} strokeWidth={borderWidth} vectorEffect="non-scaling-stroke" />
            </Box>
          )}
        </>
      )}
      {children}
    </Box>
  );
}
