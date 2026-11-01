"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Play } from "@shared/assets/icons";
import Button from "@shared/ui/Button";
import CustomIcon from "@shared/ui/CustomIcon";
import GenreList from "@shared/ui/GenreList";
import Image, { type StaticImageData } from "next/image";

export interface SpotlightTitle {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  genres?: string[];
  imageUrl: string | StaticImageData;
  watchLink: string;
}

export interface SpotlightTileProps {
  title: SpotlightTitle;
  variant: "editorial" | "poster";
  actionPosition: keyof typeof ACTION_POSITIONS;
  titleScale: number;
  imageSizes: string;
}

const ACTION_POSITIONS = {
  "top-left": { top: 18, left: 18 },
  "bottom-right": { bottom: 16, right: 16 },
} as const;

const DISPLAY_FONT = 'var(--font-display), Impact, "Arial Narrow", sans-serif';
const CONDENSED_FONT = 'var(--font-tagline), "Arial Narrow", sans-serif';

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
        containerType: "inline-size",
      }}
    >
      <Image src={imageUrl} alt="" fill sizes={imageSizes} style={{ objectFit: "cover" }} />

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
          pointerEvents: "none",
        }}
      >
        {tagline && (
          <Typography
            sx={{
              fontFamily: CONDENSED_FONT,
              fontSize: `clamp(20px, ${titleScale * TAGLINE_RATIO}cqw, 36px)`,
              fontWeight: 500,
              letterSpacing: "0.04em",
              lineHeight: 1.2,
              textTransform: editorial ? "none" : "uppercase",
              color: editorial ? "#ffffff" : "primary.main",
            }}
          >
            {tagline}
          </Typography>
        )}

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
