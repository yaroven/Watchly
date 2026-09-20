"use client";

import type { Title } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import AddIcon from "@mui/icons-material/Add";
import IosShareIcon from "@mui/icons-material/IosShare";
import StarIcon from "@mui/icons-material/Star";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { formatCount } from "@shared/lib/format-count";
import Image from "next/image";
import { useState } from "react";
import { getTitleOverviewFixture } from "../TitleOverview/mocks";

interface StreamFilmInfoProps {
  title: Title;
  episodeLabel?: string;
  rating?: number;
}

export default function StreamFilmInfo({ title, episodeLabel, rating }: StreamFilmInfoProps) {
  const { stream } = getTitleOverviewFixture(title.id);
  // PLACEHOLDER: like/dislike/watchlist below are local-only state — nothing is persisted.
  // Needs like/dislike + watchlist endpoints on the backend and initial values from them.
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(null);
  const [likes, setLikes] = useState(stream.likes);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // The design shows a dislike toggle with no visible counter — only the
  // like count and the active/inactive colour change.
  const handleLike = () => {
    if (reaction === "like") {
      setLikes((value) => value - 1);
      setReaction(null);
      return;
    }
    setLikes((value) => value + 1);
    setReaction("like");
  };

  const handleDislike = () => {
    if (reaction === "dislike") {
      setReaction(null);
      return;
    }
    if (reaction === "like") setLikes((value) => value - 1);
    setReaction("dislike");
  };

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
            onClick={handleLike}
            sx={{ ...actionButtonSx, color: reaction === "like" ? "primary.main" : "#ffffff" }}
          >
            <ThumbUpIcon sx={{ fontSize: "18px" }} />
            <Typography component="span" sx={{ fontSize: "13px" }}>
              {formatCount(likes)}
            </Typography>
          </Box>
          <Box
            component="button"
            type="button"
            onClick={handleDislike}
            sx={{ ...actionButtonSx, color: reaction === "dislike" ? "primary.main" : "#ffffff" }}
          >
            <ThumbDownIcon sx={{ fontSize: "18px" }} />
          </Box>
          <Box component="button" type="button" sx={actionButtonSx}>
            <IosShareIcon sx={{ fontSize: "18px" }} />
            <Typography component="span" sx={{ fontSize: "13px" }}>
              {formatCount(stream.shares)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: "6px", color: "primary.main" }}>
            <StarIcon sx={{ fontSize: "18px" }} />
            {/* PLACEHOLDER: 9 is a hardcoded fallback when no score prop is passed */}
            <Typography component="span" sx={{ fontSize: "13px", fontWeight: 600 }}>
              {(rating ?? 9).toFixed(1)}
            </Typography>
          </Box>
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
          onClick={() => setInWatchlist((value) => !value)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: "none",
            cursor: "pointer",
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
              {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
            </Typography>
            <Typography sx={{ fontSize: "11px", color: "#191919", opacity: 0.75, lineHeight: 1.2 }}>
              Add by {formatCount(stream.watchlistCount)} Users
            </Typography>
          </Box>
        </Box>
      </Box>

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
