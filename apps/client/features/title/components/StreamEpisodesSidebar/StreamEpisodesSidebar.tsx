"use client";

import type { Episode } from "@/features/episodes";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { getOptimizedImageSrc } from "@shared/lib/get-optimized-image-src";
import { tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import { useTranslations } from "next-intl";
import Image from "next/image";

interface StreamEpisodesSidebarProps {
  seasonNumber: number;
  episodes: Episode[];
  currentEpisodeId: string;
  onSelect: (id: string) => void;
  onSeeAll?: () => void;
  posterUrl?: string;
}

export default function StreamEpisodesSidebar({
  seasonNumber,
  episodes,
  currentEpisodeId,
  onSelect,
  onSeeAll,
  posterUrl,
}: StreamEpisodesSidebarProps) {
  const t = useTranslations("title.episodes");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      <Typography variant="h3">{t("heading")}</Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {episodes.map((episode) => (
          <Box
            key={episode.id}
            component="button"
            type="button"
            onClick={() => onSelect(episode.id)}
            aria-current={episode.id === currentEpisodeId ? "true" : undefined}
            sx={{
              position: "relative",
              width: "100%",
              aspectRatio: "341 / 176",
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid",
              borderColor: episode.id === currentEpisodeId ? "primary.main" : "divider",
              cursor: "pointer",
              padding: 0,
              font: "inherit",
              backgroundColor: tokens.surface.fill,
            }}
          >
            <Image src={getOptimizedImageSrc(posterUrl)} alt="" fill sizes="341px" style={{ objectFit: "cover" }} />

            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                px: "14px",
                py: "12px",
                background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.9) 100%)",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <Box sx={{ textAlign: "left", minWidth: 0 }}>
                <Typography sx={{ fontSize: "12px", color: "text.secondary" }}>
                  {t("shortCode", { season: seasonNumber, episode: episode.number })}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: tokens.text.primary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {episode.name}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {onSeeAll && (
        <Button variant="contained" onClick={onSeeAll} sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {t("seeAll")}
        </Button>
      )}
    </Box>
  );
}
