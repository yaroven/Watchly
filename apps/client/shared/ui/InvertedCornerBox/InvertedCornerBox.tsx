"use client";

import { Box } from "@mui/material";
import { SxProps, Theme } from "@mui/material/styles";
import { useEffect, useId, useRef, useState } from "react";

export type CornerPosition = "top left" | "top right" | "bottom left" | "bottom right";

interface InvertedCornerBoxProps {
  corners?: CornerPosition[];
  /** Skips drawing the border stroke's straight run along this side only — the two corner notches on that side stay bordered. For panels that sit flush against a neighbor and only want a seam marker (e.g. a dashed divider) there instead of a doubled border. */
  omitBorderSide?: "left" | "right";
  sx?: SxProps<Theme>;
  children?: React.ReactNode;
}

/**
 * A box whose selected corners are scooped *inward* (concave) instead of
 * rounded outward — the classic ticket/tab notch, not a plain border-radius.
 * A concave corner can't be drawn with CSS `border-radius` (always convex),
 * so it needs a clip-path.
 *
 * `clip-path: path(...)` only accepts plain SVG path numbers — no `%`, no
 * `calc()` — so a radius expressed relative to the box's own size can't be
 * written directly into it (the whole declaration just resolves to `none`,
 * silently). This component is reusable at any size, so unlike a
 * fixed-aspect hero there's no reference box to hardcode fractions against:
 * it measures its actual rendered size with a `ResizeObserver` and clips via
 * an SVG `<clipPath clipPathUnits="objectBoundingBox">`, which takes 0–1
 * fractions of the *live* box instead.
 */
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
      // `clip-path` clips against the border-box by default, but
      // `contentRect` excludes padding — measuring that mismatched the
      // radius's reference box, so it drifted whenever padding changed.
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

  // A plain CSS `border` draws to the box's rectangular edge, then gets cut
  // off wherever the clip-path happens to expose it — at the concave
  // notches that means the border just vanishes instead of following the
  // curve. Tracing the same clip path as a stroked SVG overlay is the only
  // way to get a border that actually follows the notches (same fix as the
  // hero ticket frame).
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

  // Sweep flag 0 bows each arc toward the corner tip (concave) rather than
  // away from it (a normal rounded corner uses sweep 1).
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

  // An open path tracing all 4 corner arcs (the actual "inverted border"
  // notches stay bordered) but dropping just the straight run on the
  // omitted side — traversal starts right after that edge would have ended
  // and goes the long way around back to right before it starts again.
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
