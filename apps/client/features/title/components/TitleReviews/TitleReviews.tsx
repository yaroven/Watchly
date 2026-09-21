"use client";

import type { Title } from "@/features/title/schemas/title";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ForumIcon from "@mui/icons-material/Forum";
import SortIcon from "@mui/icons-material/Sort";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { formatCount } from "@shared/lib/format-count";
import Button from "@shared/ui/Button";
import { useMemo, useState } from "react";
import { getTitleOverviewFixture, type ReviewComment } from "../TitleOverview/mocks";
import CommentCard from "./components/CommentCard";

interface TitleReviewsProps {
  title: Title;
}

type SortMode = "newest" | "oldest" | "hottest";

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "hottest", label: "Hottest" },
];

const PAGE_SIZE = 3;

function sortComments(comments: ReviewComment[], mode: SortMode) {
  const sorted = [...comments];
  if (mode === "newest") return sorted.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());
  if (mode === "oldest") return sorted.sort((a, b) => a.postedAt.getTime() - b.postedAt.getTime());
  return sorted.sort((a, b) => b.likes - a.likes);
}

export default function TitleReviews({ title }: TitleReviewsProps) {
  const { reviews } = getTitleOverviewFixture(title.id);

  const [comments, setComments] = useState(reviews);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [score, setScore] = useState(0);
  const [text, setText] = useState("");
  const [hasSpoiler, setHasSpoiler] = useState(false);

  const sortedComments = useMemo(() => sortComments(comments, sortMode), [comments, sortMode]);
  const visibleComments = sortedComments.slice(0, visibleCount);
  const totalReactions = useMemo(() => comments.reduce((sum, comment) => sum + comment.likes, 0), [comments]);

  // PLACEHOLDER: submits to local state only, never persisted. Needs a POST /titles/:id/reviews
  // endpoint and a real signed-in user for author/avatarUrl instead of the hardcoded "You".
  const handleSubmit = () => {
    if (!text.trim()) return;

    const comment: ReviewComment = {
      id: `local-${Date.now()}`,
      author: "You",
      avatarUrl: "https://picsum.photos/id/1074/120/120",
      score,
      text: hasSpoiler ? `[Contains spoilers] ${text.trim()}` : text.trim(),
      postedAt: new Date(),
      likes: 0,
      dislikes: 0,
    };

    setComments((current) => [comment, ...current]);
    setText("");
    setScore(0);
    setHasSpoiler(false);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <Typography variant="h3">Reviews</Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          borderRadius: "16px",
          border: "1px solid",
          borderColor: "divider",
          p: "20px",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: "16px", fontWeight: 600 }}>Post a comment for this series:</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>Contains spoilers</Typography>
            <Switch checked={hasSpoiler} onChange={(e) => setHasSpoiler(e.target.checked)} size="small" />
          </Box>
        </Box>

        <Box
          component="textarea"
          value={text}
          onChange={(e) => setText((e.target as HTMLTextAreaElement).value)}
          placeholder="Review Text ..."
          sx={{
            width: "100%",
            minHeight: "140px",
            resize: "vertical",
            borderRadius: "12px",
            border: "1px solid",
            borderColor: "primary.main",
            backgroundColor: "transparent",
            color: "#e5e5e5",
            padding: "14px",
            font: "inherit",
            fontSize: "14px",
            "&::placeholder": { color: "text.secondary" },
          }}
        />

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!text.trim()}
            sx={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            Submit Review
            <ForumIcon sx={{ fontSize: "18px" }} />
          </Button>

          <Box sx={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "220px" }}>
            <Typography sx={{ fontSize: "13px", color: "text.secondary", whiteSpace: "nowrap" }}>Your Score</Typography>
            <Slider
              value={score}
              onChange={(_, value) => setScore(value as number)}
              min={0}
              max={10}
              step={1}
              size="small"
              sx={{ color: "primary.main" }}
            />
            <Typography sx={{ fontSize: "13px", color: "#ffffff", width: "16px" }}>{score}</Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          borderRadius: "12px",
          border: "1px solid",
          borderColor: "divider",
          px: "16px",
          py: "12px",
        }}
      >
        <SortIcon sx={{ fontSize: "18px", color: "text.secondary" }} />
        <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>Sort by:</Typography>
        {SORT_OPTIONS.map(({ key, label }) => (
          <Box
            key={key}
            component="button"
            type="button"
            onClick={() => setSortMode(key)}
            sx={{
              border: "none",
              font: "inherit",
              cursor: "pointer",
              borderRadius: "999px",
              px: "16px",
              py: "6px",
              fontSize: "14px",
              fontWeight: 600,
              color: sortMode === key ? "primary.contrastText" : "text.secondary",
              backgroundColor: sortMode === key ? "primary.main" : "transparent",
            }}
          >
            {label}
          </Box>
        ))}
        <Typography sx={{ fontSize: "14px", color: "text.secondary", ml: "auto" }}>({formatCount(totalReactions)})</Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {visibleComments.map((comment) => (
          <CommentCard key={comment.id} comment={comment} />
        ))}
      </Box>

      {visibleCount < sortedComments.length && (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button
            variant="outlined"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            sx={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            Show more
            <ExpandMore sx={{ fontSize: "18px" }} />
          </Button>
        </Box>
      )}
    </Box>
  );
}
