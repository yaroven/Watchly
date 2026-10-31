"use client";

import EpisodeList from "@features/episodes/components/EpisodeList";
import { Episode } from "@features/episodes/schemas/episode";
import SeasonTabs from "@features/season/components/SeasonTabs";
import { Season } from "@features/season/schemas/season";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { APP } from "@shared/lib/routes";
import { tokens } from "@shared/mui/theme";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback } from "react";

interface SeriesEpisodeBrowserProps {
  titleId: string;
  seasons: Season[];
  episodes: Episode[];
  currentSeasonId: string;
}

export default function SeriesEpisodeBrowser({ titleId, seasons, episodes, currentSeasonId }: SeriesEpisodeBrowserProps) {
  const router = useRouter();
  const [, setSeasonId] = useQueryState("season", { history: "replace", shallow: false });

  const handleSeasonChange = useCallback(
    (id: string) => {
      void setSeasonId(id, { scroll: false });
    },
    [setSeasonId],
  );

  const handleEpisodeSelect = useCallback(
    (id: string) => {
      router.push(APP.WATCH(titleId, id));
    },
    [router, titleId],
  );

  const currentSeasonPosterUrl = seasons.find((season) => season.id === currentSeasonId)?.posterUrl;

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: "20px",
        overflow: "visible",
        border: "1px solid transparent",
        background: `linear-gradient(180deg, ${tokens.surface.fill} 0%, ${tokens.surface.default} 100%) padding-box, linear-gradient(180deg, ${tokens.border.faint} 0%, rgba(102,102,102,0) 100%) border-box`,
      }}
    >
      {seasons.length > 0 && (
        <Box
          sx={{
            position: "absolute",
            bottom: "100%",
            mb: "-1px",
            right: "-1px",
            display: "flex",
            alignItems: "center",
            p: "8px 8px 0",
            border: "1px solid",
            borderColor: tokens.border.faint,
            borderBottom: "none",
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "20px",
            backgroundColor: tokens.surface.fill,
            overflow: "hidden",
          }}
        >
          <SeasonTabs onClick={handleSeasonChange} seasons={seasons} currentSeasonId={currentSeasonId} />
        </Box>
      )}

      <Box sx={{ borderRadius: "20px", overflow: "hidden" }}>
        <Box sx={{ px: "24px", pt: "24px" }}>
          <Typography variant="h4">Episodes</Typography>
        </Box>

        <Box sx={{ borderBottom: "1px solid", borderColor: "divider", mt: "20px" }} />

        <Box sx={{ p: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <Chip
            label={`${episodes.length} Episode${episodes.length === 1 ? "" : "s"}`}
            sx={{ bgcolor: tokens.surface.fill, color: tokens.text.field, alignSelf: "flex-start" }}
          />

          {episodes.length ? (
            <EpisodeList episodes={episodes} onClick={handleEpisodeSelect} currentEpisodeId="" posterUrl={currentSeasonPosterUrl} />
          ) : (
            <Typography sx={{ color: "text.secondary" }}>Episodes for this season have not been added yet.</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
