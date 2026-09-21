"use client";

import EpisodeList from "@features/episodes/components/EpisodeList";
import { Episode } from "@features/episodes/schemas/episode";
import SeasonTabs from "@features/season/components/SeasonTabs";
import { Season } from "@features/season/schemas/season";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { APP } from "@shared/lib/routes";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback } from "react";

interface SeriesEpisodeBrowserProps {
  titleId: string;
  seasons: Season[];
  episodes: Episode[];
  currentSeasonId: string;
}

/**
 * Browses seasons/episodes on the title-detail (Film) page — no player here
 * (that lives on the dedicated watch/stream page). Picking an episode
 * navigates there instead of switching an inline player.
 */
export default function SeriesEpisodeBrowser({ titleId, seasons, episodes, currentSeasonId }: SeriesEpisodeBrowserProps) {
  const router = useRouter();
  // shallow:false — this page reads `searchParams.season` server-side
  // (app/.../series/[id]/page.tsx) to fetch that season's episodes, so the
  // query change has to trigger a real Next.js navigation, not just a URL
  // update, or the episode list and active tab never actually switch.
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
        // Fades from a lighter tile at the top down into the page background —
        // both the fill and the border fade to transparent/page-bg by the bottom.
        background:
          "linear-gradient(180deg, #333333 0%, #191919 100%) padding-box, linear-gradient(180deg, #666666 0%, rgba(102,102,102,0) 100%) border-box",
      }}
    >
      {seasons.length > 0 && (
        // Docked above the card's own top edge, so the season-tab bar reads
        // as part of the frame instead of content sitting inside it. The
        // radial-gradient patch fakes a concave seam (same "material scooped
        // away" language as InvertedCornerBox) where the dock's left edge
        // meets the card's flat top border.
        <Box sx={{ position: "absolute", top: "-32px", right: "-1px", display: "flex" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              p: "8px 8px 0",
              border: "1px solid #666666",
              borderBottom: "none",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "20px",
              backgroundColor: "#333333",
              overflow: "hidden",
            }}
          >
            <SeasonTabs onClick={handleSeasonChange} seasons={seasons} currentSeasonId={currentSeasonId} />
          </Box>
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              left: "-16px",
              bottom: "-1px",
              width: "16px",
              height: "16px",
              background: "radial-gradient(circle at bottom right, transparent 0 15px, #666666 15px 16px, #333333 16px)",
            }}
          />
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
            sx={{ bgcolor: "#333333", color: "#e5e5e5", alignSelf: "flex-start" }}
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
