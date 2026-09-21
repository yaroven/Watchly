"use client";

import { TitleType } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import MovieIcon from "@mui/icons-material/Movie";
import TheatersIcon from "@mui/icons-material/Theaters";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";

interface TitleIdentityProps {
  name: string;
  posterUrl?: string;
  to: string;
  type: TitleType;
}

export default function TitleIdentity({ name, posterUrl = "/cat.webp", to, type }: TitleIdentityProps) {
  const typeLabel = type === TitleType.MOVIE ? "Movie" : "Series";
  const posterSrc = getOptimizedImageSrc(posterUrl);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "18px", minWidth: 0 }}>
      <Box
        component={Link}
        href={to}
        sx={{
          position: "relative",
          lineHeight: 0,
          flexShrink: 0,
          borderRadius: "10px",
          border: "1px solid",
          borderColor: "rgba(255,255,255,0.12)",
          overflow: "hidden",
        }}
      >
        <Image src={posterSrc} alt={name} width={56} height={80} style={{ display: "block", objectFit: "cover" }} />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          component={Link}
          href={to}
          sx={{
            display: "inline-block",
            fontSize: "1.05rem",
            fontWeight: 800,
            color: "#ffffff",
            textDecoration: "none",
            "&:hover": { color: "primary.main" },
          }}
        >
          {name}
        </Typography>

        <Box sx={{ mt: "10px" }}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              fontSize: "0.76rem",
              fontWeight: 800,
            }}
          >
            {type === TitleType.MOVIE ? <MovieIcon sx={{ fontSize: 14 }} /> : <TheatersIcon sx={{ fontSize: 14 }} />}
            {typeLabel}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
