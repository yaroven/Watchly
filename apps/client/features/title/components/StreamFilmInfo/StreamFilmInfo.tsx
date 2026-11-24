"use client";

import { FeatureGate } from "@/features/feature-flags";
import { ReactionType, useSetTitleReaction, useSetTitleWatchlist, useTitleEngagement } from "@/features/title-engagement";
import type { Title } from "@/features/title/schemas/title";
import { useRouter } from "@/i18n/navigation";
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
import { INLINE_ERROR } from "@shared/api/write-errors";
import { formatCount } from "@shared/lib/format-count";
import { useLoginPath } from "@shared/lib/use-login-path";
import { useViewer } from "@shared/lib/use-viewer";
import { nextVote, viewerControl } from "@shared/lib/viewer-control";
import { tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface StreamFilmInfoProps {
  title: Title;
  episodeLabel?: string;
  rating?: number;
}

export default function StreamFilmInfo({ title, episodeLabel, rating }: StreamFilmInfoProps) {
  const t = useTranslations("title.engagement");
  const router = useRouter();
  const signInPath = useLoginPath();
  const viewer = useViewer();
  const [expanded, setExpanded] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");
  const shareTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(shareTimer.current), []);

  const { data: liveEngagement, isError: engagementFailed, refetch } = useTitleEngagement(title.id);
  const engagement = liveEngagement ?? title.engagement;
  const viewerEngagement = engagement.viewer;

  const react = useSetTitleReaction(title.id, { meta: INLINE_ERROR });
  const setWatchlist = useSetTitleWatchlist(title.id, { meta: INLINE_ERROR });
  const writeError = react.error ?? setWatchlist.error;

  const known = viewerEngagement !== null;
  const reactControl = viewerControl({ viewer: viewer.status, known, refreshFailed: engagementFailed, busy: react.isPending });
  const watchlistControl = viewerControl({ viewer: viewer.status, known, refreshFailed: engagementFailed, busy: setWatchlist.isPending });
  const viewerStateUnknown = reactControl.state === "unknown";

  const handleReact = (type: ReactionType) => {
    if (reactControl.intent === "sign-in") return router.push(signInPath());
    if (reactControl.intent === "write") react.mutate(nextVote(viewerEngagement?.reaction ?? null, type));
  };

  const handleWatchlist = () => {
    if (watchlistControl.intent === "sign-in") return router.push(signInPath());
    if (watchlistControl.intent === "write" && viewerEngagement) setWatchlist.mutate(!viewerEngagement.inWatchlist);
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

  const shareLabel = shareState === "copied" ? t("copied") : shareState === "failed" ? t("copyFailed") : t("share");

  const storyline = title.description || t("descriptionPlaceholder");
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
            backgroundColor: tokens.surface.dropzone,
            px: "16px",
            py: "8px",
          }}
        >
          <FeatureGate flag="reactions">
            <Box
              component="button"
              type="button"
              aria-label={viewerEngagement?.reaction === ReactionType.LIKE ? t("removeLike") : t("like")}
              aria-pressed={viewerEngagement ? viewerEngagement.reaction === ReactionType.LIKE : undefined}
              disabled={reactControl.disabled}
              onClick={() => handleReact(ReactionType.LIKE)}
              sx={{ ...actionButtonSx, color: viewerEngagement?.reaction === ReactionType.LIKE ? "primary.main" : tokens.text.primary }}
            >
              <ThumbUpIcon sx={{ fontSize: "18px" }} />
              <Typography component="span" sx={{ fontSize: "13px" }}>
                {formatCount(engagement.likes)}
              </Typography>
            </Box>
            <Box
              component="button"
              type="button"
              aria-label={viewerEngagement?.reaction === ReactionType.DISLIKE ? t("removeDislike") : t("dislike")}
              aria-pressed={viewerEngagement ? viewerEngagement.reaction === ReactionType.DISLIKE : undefined}
              disabled={reactControl.disabled}
              onClick={() => handleReact(ReactionType.DISLIKE)}
              sx={{ ...actionButtonSx, color: viewerEngagement?.reaction === ReactionType.DISLIKE ? "primary.main" : tokens.text.primary }}
            >
              <ThumbDownIcon sx={{ fontSize: "18px" }} />
            </Box>
          </FeatureGate>
          <Box component="button" type="button" aria-label={t("copyLink")} onClick={handleShare} sx={actionButtonSx}>
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
          <Typography sx={{ fontSize: "22px", fontWeight: 600, color: tokens.text.field }}>{title.name}</Typography>
        </Box>

        <Box
          component="button"
          type="button"
          aria-pressed={viewerEngagement ? viewerEngagement.inWatchlist : undefined}
          disabled={watchlistControl.disabled}
          onClick={handleWatchlist}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: "none",
            cursor: watchlistControl.intent === "write" ? "pointer" : "default",
            opacity: watchlistControl.state === "ready" ? 1 : 0.6,
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
              border: `1.5px solid ${tokens.surface.default}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AddIcon sx={{ fontSize: "16px", color: tokens.surface.default }} />
          </Box>
          <Box sx={{ textAlign: "left" }}>
            <Typography sx={{ fontSize: "14px", fontWeight: 700, color: tokens.surface.default, lineHeight: 1.2 }}>
              {viewerEngagement ? (viewerEngagement.inWatchlist ? t("inWatchlist") : t("addToWatchlist")) : t("watchlist")}
            </Typography>
            <Typography sx={{ fontSize: "11px", color: tokens.surface.default, opacity: 0.75, lineHeight: 1.2 }}>
              {t("addedBy", { count: engagement.watchlistCount, formatted: formatCount(engagement.watchlistCount) })}
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
                {t("retry")}
              </Button>
            ) : undefined
          }
        >
          {writeError
            ? t("writeError", { message: writeError.message })
            : viewerStateUnknown
              ? t("viewerStateUnknown")
              : t("refreshFailed")}
        </Alert>
      )}

      <Divider sx={{ borderColor: "divider" }} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Typography sx={{ color: "text.secondary", fontSize: "16px" }}>{t("storyline")}</Typography>
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
              {expanded ? t("showLess") : t("readMore")}
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
  color: tokens.text.primary,
  transition: "color .15s ease-out",
  ":hover": { color: "primary.main" },
} as const;
