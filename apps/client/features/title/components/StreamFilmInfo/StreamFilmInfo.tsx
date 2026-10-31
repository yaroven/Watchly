"use client";

import { FeatureGate } from "@/features/feature-flags";
import { ReactionType, useSetTitleReaction, useSetTitleWatchlist, useTitleEngagement } from "@/features/title-engagement";
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
import { APP } from "@shared/lib/routes";
import { useViewer } from "@shared/lib/use-viewer";
import Button from "@shared/ui/Button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface StreamFilmInfoProps {
  title: Title;
  episodeLabel?: string;
  rating?: number;
}

export default function StreamFilmInfo({ title, episodeLabel, rating }: StreamFilmInfoProps) {
  const router = useRouter();
  const viewer = useViewer();
  const [expanded, setExpanded] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");
  const shareTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(shareTimer.current), []);

  const { data: liveEngagement, isError: engagementFailed, refetch } = useTitleEngagement(title.id);
  const engagement = liveEngagement ?? title.engagement;
  const viewerEngagement = engagement.viewer;

  const react = useSetTitleReaction(title.id);
  const setWatchlist = useSetTitleWatchlist(title.id);
  const writeError = react.error ?? setWatchlist.error;

  const viewerStateUnknown = viewer.status === "signed-in" && (viewerEngagement === null || engagementFailed);
  const togglesDisabled = viewer.status !== "signed-in" || viewerStateUnknown;

  const handleToggleWhileAnonymous = () => router.push(APP.LOGIN);

  const handleReact = (type: ReactionType) => {
    if (viewer.status === "anonymous") return handleToggleWhileAnonymous();
    if (togglesDisabled || react.isPending) return;
    react.mutate(viewerEngagement?.reaction === type ? null : type);
  };

  const flashShareState = (next: "copied" | "failed") => {
    setShareState(next);
    window.clearTimeout(shareTimer.current);
    shareTimer.current = window.setTimeout(() => setShareState("idle"), 2000);
  };

  const handleShare = async () => {
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
          <FeatureGate flag="reactions">
            <Box
              component="button"
              type="button"
              aria-label={viewerEngagement?.reaction === ReactionType.LIKE ? "Remove like" : "Like"}
              aria-pressed={viewerEngagement ? viewerEngagement.reaction === ReactionType.LIKE : undefined}
              disabled={viewerStateUnknown || viewer.status === "pending" || react.isPending}
              onClick={() => handleReact(ReactionType.LIKE)}
              sx={{ ...actionButtonSx, color: viewerEngagement?.reaction === ReactionType.LIKE ? "primary.main" : "#ffffff" }}
            >
              <ThumbUpIcon sx={{ fontSize: "18px" }} />
              <Typography component="span" sx={{ fontSize: "13px" }}>
                {formatCount(engagement.likes)}
              </Typography>
            </Box>
            <Box
              component="button"
              type="button"
              aria-label={viewerEngagement?.reaction === ReactionType.DISLIKE ? "Remove dislike" : "Dislike"}
              aria-pressed={viewerEngagement ? viewerEngagement.reaction === ReactionType.DISLIKE : undefined}
              disabled={viewerStateUnknown || viewer.status === "pending" || react.isPending}
              onClick={() => handleReact(ReactionType.DISLIKE)}
              sx={{ ...actionButtonSx, color: viewerEngagement?.reaction === ReactionType.DISLIKE ? "primary.main" : "#ffffff" }}
            >
              <ThumbDownIcon sx={{ fontSize: "18px" }} />
            </Box>
          </FeatureGate>
          <Box component="button" type="button" aria-label="Copy link to this title" onClick={handleShare} sx={actionButtonSx}>
            <IosShareIcon sx={{ fontSize: "18px" }} />
            <Typography component="span" sx={{ fontSize: "13px", color: shareState === "failed" ? "error.main" : "inherit" }}>
              {shareLabel}
            </Typography>
          </Box>
          {(rating ?? title.engagement.averageScore) !== null && (rating ?? title.engagement.averageScore) !== undefined && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "6px", color: "primary.main" }}>
              <StarIcon sx={{ fontSize: "18px" }} />
              <Typography component="span" sx={{ fontSize: "13px", fontWeight: 600 }}>
                {(rating ?? title.engagement.averageScore!).toFixed(1)}
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
          aria-pressed={viewerEngagement ? viewerEngagement.inWatchlist : undefined}
          disabled={viewerStateUnknown || viewer.status === "pending" || setWatchlist.isPending}
          onClick={() => {
            if (viewer.status === "anonymous") return handleToggleWhileAnonymous();
            if (viewerEngagement) setWatchlist.mutate(!viewerEngagement.inWatchlist);
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: "none",
            cursor: togglesDisabled ? "default" : "pointer",
            opacity: togglesDisabled ? 0.6 : 1,
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
              {viewerEngagement ? (viewerEngagement.inWatchlist ? "In Watchlist" : "Add to Watchlist") : "Watchlist"}
            </Typography>
            <Typography sx={{ fontSize: "11px", color: "#191919", opacity: 0.75, lineHeight: 1.2 }}>
              Added by {formatCount(engagement.watchlistCount)} {engagement.watchlistCount === 1 ? "User" : "Users"}
            </Typography>
          </Box>
        </Box>
      </Box>

      {(writeError || engagementFailed || viewerStateUnknown) && (
        <Alert
          severity="error"
          variant="outlined"
          sx={{ alignItems: "center" }}
          action={
            viewerStateUnknown || engagementFailed ? (
              <Button variant="outlined" onClick={() => void refetch()} sx={{ paddingBlock: "4px", minHeight: "unset" }}>
                Retry
              </Button>
            ) : undefined
          }
        >
          {writeError
            ? `Could not save that: ${writeError.message}`
            : viewerStateUnknown
              ? "We could not tell whether you have liked or saved this title, so those controls are disabled. The counts below may also be out of date."
              : "Could not refresh the likes and watchlist counts for this title, so they may be out of date."}
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
