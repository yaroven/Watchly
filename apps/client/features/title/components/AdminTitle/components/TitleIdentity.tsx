"use client";

import { TitleType } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import MovieIcon from "@mui/icons-material/Movie";
import TheatersIcon from "@mui/icons-material/Theaters";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { tokens } from "@shared/mui/theme";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

interface TitleIdentityProps {
  name: string;
  posterUrl?: string;
  to: string;
  type: TitleType;
  untranslated?: boolean;
}

export default function TitleIdentity({ name, posterUrl, to, type, untranslated = false }: TitleIdentityProps) {
  const t = useTranslations("title");
  const typeLabel = t(`type.${type}`);
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
            color: tokens.text.primary,
            textDecoration: "none",
            "&:hover": { color: "primary.main" },
          }}
        >
          {name}
        </Typography>

        <Box sx={{ mt: "10px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
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

          {untranslated && (
            <Box
              component="span"
              sx={{
                px: "8px",
                py: "1px",
                borderRadius: "999px",
                border: `1px solid ${tokens.border.subtle}`,
                color: tokens.text.secondary,
                fontSize: "0.72rem",
                fontWeight: 600,
                lineHeight: 1.6,
                whiteSpace: "nowrap",
              }}
            >
              {t("admin.notTranslated")}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
