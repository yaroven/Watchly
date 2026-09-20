"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Play } from "@shared/assets/icons";
import Button from "@shared/ui/Button";
import CustomIcon from "@shared/ui/CustomIcon";
import GenreList from "@shared/ui/GenreList";
import Image from "next/image";

export interface SpotlightTitle {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  genres?: string[];
  imageUrl: string;
  watchLink: string;
}

export interface SpotlightTileProps {
  title: SpotlightTitle;
  /**
   * Which slot of the grid this tile fills, not a property of the title —
   * "editorial" centres a narrow text column against the left edge, "poster"
   * pins a large name to the bottom across the full width.
   */
  variant: "editorial" | "poster";
  actionPosition: keyof typeof ACTION_POSITIONS;
  /**
   * Name size as a percentage of the tile's own width. The slots differ in
   * width by more than 2x, so a viewport-based size would leave the narrow
   * one tiny; this makes the type scale with the artwork it sits on. Every
   * other size in the tile is a fixed ratio of it.
   */
  titleScale: number;
  /** The tile's rendered width, for the image optimiser to pick a source. */
  imageSizes: string;
}

const ACTION_POSITIONS = {
  "top-left": { top: 18, left: 18 },
  "bottom-right": { bottom: 16, right: 16 },
} as const;

// Impact and Alumni Sans from the design. Anton substitutes for Impact —
// see the comment in app/layout.tsx — with Impact kept as a local fallback.
const DISPLAY_FONT = 'var(--font-display), Impact, "Arial Narrow", sans-serif';
const CONDENSED_FONT = 'var(--font-tagline), "Arial Narrow", sans-serif';

// Ratios to the name, measured off the design file.
const TAGLINE_RATIO = 0.3;
const GENRE_RATIO = 0.29;
const BODY_RATIO = 0.22;

export default function SpotlightTile({ title, variant, actionPosition, titleScale, imageSizes }: SpotlightTileProps) {
  const { name, tagline, description, genres, imageUrl, watchLink } = title;
  const editorial = variant === "editorial";

  return (
    <Box
      sx={{
        position: "relative",
        height: "100%",
        minWidth: 0,
        overflow: "hidden",
        borderRadius: "12px",
        // Turns this tile into the reference box for the cqw sizes below.
        containerType: "inline-size",
      }}
    >
      <Image src={imageUrl} alt="" fill sizes={imageSizes} style={{ objectFit: "cover" }} />

      {/* Editorial darkens the left edge under its text column; poster darkens
          the floor under the name. Neither dims the artwork it doesn't cover. */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: editorial
            ? "linear-gradient(90deg, rgba(0,0,0,.85) 0%, rgba(0,0,0,0) 60%)"
            : "linear-gradient(0deg, rgba(0,0,0,.8) 0%, rgba(0,0,0,0) 55%)",
        }}
      />

      <Box sx={{ position: "absolute", zIndex: 1, ...ACTION_POSITIONS[actionPosition] }}>
        <Button
          isPill
          startIcon={<CustomIcon icon={Play} sx={{ fontSize: "20px" }} />}
          href={watchLink}
          sx={{ minHeight: "unset", paddingBlock: "8px", paddingInline: "16px", fontSize: "clamp(13px, 0.95vw, 17px)", fontWeight: 600 }}
        >
          Watch now
        </Button>
      </Box>

      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: editorial ? "center" : "flex-end",
          gap: "0.6cqw",
          maxWidth: editorial ? { xs: "100%", md: "50%" } : "100%",
          p: "clamp(16px, 2.5cqw, 40px)",
          // Leaves the action button clickable through the text layer's gaps.
          pointerEvents: "none",
        }}
      >
        {tagline && (
          <Typography
            sx={{
              fontFamily: CONDENSED_FONT,
              fontSize: `clamp(20px, ${titleScale * TAGLINE_RATIO}cqw, 36px)`,
              fontWeight: 500,
              // Alumni Sans is condensed; without tracking the line reads as a
              // solid block at these sizes.
              letterSpacing: "0.04em",
              lineHeight: 1.2,
              // The poster slots set their tagline as a gold eyebrow over the
              // name; the editorial one runs as plain copy above its heading.
              textTransform: editorial ? "none" : "uppercase",
              color: editorial ? "#ffffff" : "primary.main",
            }}
          >
            {tagline}
          </Typography>
        )}

        {/* Baseline alignment puts the genres on the name's first line, so a
            name that wraps still keeps them level with its top row. */}
        <Box sx={{ display: "flex", alignItems: "baseline", gap: "2cqw", flexWrap: "wrap" }}>
          <Typography
            variant="h1"
            sx={{
              fontFamily: DISPLAY_FONT,
              fontSize: `clamp(26px, ${titleScale}cqw, 96px)`,
              fontWeight: 400,
              lineHeight: 1.0,
              color: editorial ? "primary.main" : "#ffffff",
            }}
          >
            {name}
          </Typography>
          {/* An empty array is 0, which React would render as a stray digit. */}
          {!!genres?.length && (
            <GenreList
              genres={genres}
              separator="comma"
              sx={{
                fontFamily: CONDENSED_FONT,
                fontSize: `clamp(13px, ${titleScale * GENRE_RATIO}cqw, 28px)`,
                fontWeight: 500,
                letterSpacing: "0.02em",
              }}
            />
          )}
        </Box>

        {description && (
          <Typography
            sx={{
              mt: "0.8cqw",
              fontSize: `clamp(13px, ${titleScale * BODY_RATIO}cqw, 20px)`,
              fontWeight: 400,
              lineHeight: 1.55,
            }}
          >
            {description}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
