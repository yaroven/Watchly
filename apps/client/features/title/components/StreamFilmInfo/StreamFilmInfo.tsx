"use client";

import { ReactionType, useReactToTitle, useSetTitleWatchlist, useTitleEngagement } from "@/features/title-engagement";
import type { Title } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import AddIcon from "@mui/icons-material/Add";
import IosShareIcon from "@mui/icons-material/IosShare";
import StarIcon from "@mui/icons-material/Star";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { formatCount } from "@shared/lib/format-count";
import { useViewer } from "@shared/lib/use-viewer";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface StreamFilmInfoProps {
  title: Title;
  episodeLabel?: string;
  rating?: number;
}

export default function StreamFilmInfo({ title, episodeLabel, rating }: StreamFilmInfoProps) {
  const { isSignedIn } = useViewer();
  const [expanded, setExpanded] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");
  const shareTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(shareTimer.current), []);

  // The page is server-rendered with no session — `shared/api/axios.ts` reads its
  // bearer from the auth store, which is empty there, and the refresh cookie is not
  // forwarded. So `title.engagement` seeds the public counts only; the viewer's own
  // vote and watchlist state are always null until the client query lands.
  const { data: liveEngagement, isError: engagementFailed } = useTitleEngagement(title.id);
  const engagement = liveEngagement ?? title.engagement;

  const react = useReactToTitle(title.id);
  const setWatchlist = useSetTitleWatchlist(title.id);
  const writeError = react.error ?? setWatchlist.error;

  // The design shows a dislike toggle with no visible counter — only the
  // like count and the active/inactive colour change.
  const handleReact = (type: ReactionType) => {
    if (!isSignedIn) return;
    react.mutate(type);
  };

  const flashShareState = (next: "copied" | "failed") => {
    setShareState(next);
    window.clearTimeout(shareTimer.current);
    shareTimer.current = window.setTimeout(() => setShareState("idle"), 2000);
  };

  const handleShare = async () => {
    // `navigator.clipboard` is undefined outside a secure context, so this is a
    // plain failure on any http deployment rather than something exceptional.
    if (!navigator.clipboard) {
      flashShareState("failed");
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch (error) {
      console.error("Failed to copy the title link", error);
      flashShareState("failed");
      return;
    }
    flashShareState("copied");
  };

  const shareLabel = shareState === "copied" ? "Copied" : shareState === "failed" ? "Copy failed" : "Share";

  const storyline = title.description || "Description will appear here once added.";
  const isLong = storyline.length > 220;
  const displayedStoryline = expanded || !isLong ? storyline : `${storyline.slice(0, 220)}…`;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <Typography sx={{ color: "text.secondary", fontSize: "16px" }}>{episodeLabel}</Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            borderRadius: "999px",
            backgroundColor: "#111111",
            px: "16px",
            py: "8px",
          }}
        >
          <Box
            component="button"
            type="button"
            aria-label={engagement.myReaction === ReactionType.LIKE ? "Remove like" : "Like"}
            aria-pressed={engagement.myReaction === ReactionType.LIKE}
            disabled={!isSignedIn || react.isPending}
            onClick={() => handleReact(ReactionType.LIKE)}
            sx={{ ...actionButtonSx, color: engagement.myReaction === ReactionType.LIKE ? "primary.main" : "#ffffff" }}
          >
            <ThumbUpIcon sx={{ fontSize: "18px" }} />
            <Typography component="span" sx={{ fontSize: "13px" }}>
              {formatCount(engagement.likes)}
            </Typography>
          </Box>
          <Box
            component="button"
            type="button"
            aria-label={engagement.myReaction === ReactionType.DISLIKE ? "Remove dislike" : "Dislike"}
            aria-pressed={engagement.myReaction === ReactionType.DISLIKE}
            disabled={!isSignedIn || react.isPending}
            onClick={() => handleReact(ReactionType.DISLIKE)}
            sx={{ ...actionButtonSx, color: engagement.myReaction === ReactionType.DISLIKE ? "primary.main" : "#ffffff" }}
          >
            <ThumbDownIcon sx={{ fontSize: "18px" }} />
          </Box>
          <Box component="button" type="button" aria-label="Copy link to this title" onClick={handleShare} sx={actionButtonSx}>
            <IosShareIcon sx={{ fontSize: "18px" }} />
            <Typography component="span" sx={{ fontSize: "13px", color: shareState === "failed" ? "error.main" : "inherit" }}>
              {shareLabel}
            </Typography>
          </Box>
          {(rating ?? title.rating?.average) !== null && (rating ?? title.rating?.average) !== undefined && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "6px", color: "primary.main" }}>
              <StarIcon sx={{ fontSize: "18px" }} />
              <Typography component="span" sx={{ fontSize: "13px", fontWeight: 600 }}>
                {(rating ?? title.rating!.average!).toFixed(1)}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Box
            sx={{
              position: "relative",
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              overflow: "hidden",
              border: "1px solid",
              borderColor: "primary.main",
              flexShrink: 0,
            }}
          >
            <Image src={getOptimizedImageSrc(title.posterUrl)} alt={title.name} fill sizes="56px" style={{ objectFit: "cover" }} />
          </Box>
          <Typography sx={{ fontSize: "22px", fontWeight: 600, color: "#e5e5e5" }}>{title.name}</Typography>
        </Box>

        <Box
          component="button"
          type="button"
          aria-pressed={engagement.inWatchlist}
          disabled={!isSignedIn || setWatchlist.isPending}
          onClick={() => setWatchlist.mutate(!engagement.inWatchlist)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: "none",
            cursor: isSignedIn ? "pointer" : "default",
            opacity: isSignedIn ? 1 : 0.6,
            borderRadius: "12px",
            backgroundColor: "primary.main",
            px: "18px",
            py: "10px",
            font: "inherit",
          }}
        >
          <Box
            sx={{
              width: "22px",
              height: "22px",
              borderRadius: "6px",
              border: "1.5px solid #191919",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AddIcon sx={{ fontSize: "16px", color: "#191919" }} />
          </Box>
          <Box sx={{ textAlign: "left" }}>
            <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#191919", lineHeight: 1.2 }}>
              {engagement.inWatchlist ? "In Watchlist" : "Add to Watchlist"}
            </Typography>
            <Typography sx={{ fontSize: "11px", color: "#191919", opacity: 0.75, lineHeight: 1.2 }}>
              Added by {formatCount(engagement.watchlistCount)} {engagement.watchlistCount === 1 ? "User" : "Users"}
            </Typography>
          </Box>
        </Box>
      </Box>

      {(writeError || engagementFailed) && (
        <Alert severity="error" variant="outlined" sx={{ alignItems: "center" }}>
          {writeError
            ? `Could not save that: ${writeError.message}`
            : "Could not load the likes and watchlist state for this title — the counts below may be out of date."}
        </Alert>
      )}

      <Divider sx={{ borderColor: "divider" }} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Typography sx={{ color: "text.secondary", fontSize: "16px" }}>Story line:</Typography>
        <Typography sx={{ color: "text.secondary", fontSize: "15px", lineHeight: 1.7 }}>
          {displayedStoryline}
          {isLong && (
            <Typography
              component="button"
              type="button"
              onClick={() => setExpanded((value) => !value)}
              sx={{
                display: "inline",
                border: "none",
                background: "none",
                cursor: "pointer",
                font: "inherit",
                fontSize: "15px",
                color: "primary.main",
                p: 0,
                ml: "4px",
              }}
            >
              {expanded ? "Show Less" : "Read More"}
            </Typography>
          )}
        </Typography>
      </Box>
    </Box>
  );
}

const actionButtonSx = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  border: "none",
  background: "none",
  font: "inherit",
  cursor: "pointer",
  padding: 0,
  color: "#ffffff",
  transition: "color .15s ease-out",
  ":hover": { color: "primary.main" },
} as const;
