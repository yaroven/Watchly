"use client";

import { type CommentSortMode, useComments, useCreateComment } from "@/features/comment";
import { useRemoveTitleRating, useSetTitleRating, useTitleRating } from "@/features/title-rating";
import type { Title } from "@/features/title/schemas/title";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ForumIcon from "@mui/icons-material/Forum";
import SortIcon from "@mui/icons-material/Sort";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useAuthStore } from "@shared/lib/auth-store";
import { formatCount } from "@shared/lib/format-count";
import Button from "@shared/ui/Button";
import { useState } from "react";
import CommentCard from "./components/CommentCard";

interface TitleReviewsProps {
  title: Title;
}

const SORT_OPTIONS: { key: CommentSortMode; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "hottest", label: "Hottest" },
];

const PAGE_SIZE = 5;

export default function TitleReviews({ title }: TitleReviewsProps) {
  const userId = useAuthStore((state) => state.userId);
  const authStatus = useAuthStore((state) => state.status);
  const isSignedIn = Boolean(userId);
  // Both reads are personalised (own score, own reactions), so they wait for the session restore.
  const sessionReady = authStatus === "resolved";

  const [sortMode, setSortMode] = useState<CommentSortMode>("newest");
  const [text, setText] = useState("");
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [score, setScore] = useState(0);

  const { data: rating } = useTitleRating(title.id);
  const setRating = useSetTitleRating(title.id);
  const removeRating = useRemoveTitleRating(title.id);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useComments(title.id, sortMode, PAGE_SIZE, sessionReady);
  const comments = data?.pages.flatMap((page) => page.items) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  const createComment = useCreateComment(title.id, {
    onSuccess: () => {
      setText("");
      setHasSpoiler(false);
    },
  });

  // Adjusting state during render rather than in an effect: the slider follows the saved score
  // whenever the server's value changes, but stays put while the viewer is dragging it.
  const [syncedScore, setSyncedScore] = useState<number | null>(null);
  if (rating !== undefined && syncedScore !== rating.myScore) {
    setSyncedScore(rating.myScore);
    setScore(rating.myScore ?? 0);
  }

  const handleSubmit = () => {
    if (!text.trim()) return;
    createComment.mutate({ text: text.trim(), hasSpoiler });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: "16px", flexWrap: "wrap" }}>
        <Typography variant="h3">Reviews</Typography>
        <Typography sx={{ fontSize: "15px", color: "text.secondary" }}>
          {rating?.average === null || rating === undefined
            ? "Not rated yet"
            : `${rating.average}/10 from ${formatCount(rating.count)} ${rating.count === 1 ? "viewer" : "viewers"}`}
        </Typography>
      </Box>

      {isSignedIn && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            borderRadius: "16px",
            border: "1px solid",
            borderColor: "divider",
            p: "20px",
          }}
        >
          <Typography sx={{ fontSize: "16px", fontWeight: 600, whiteSpace: "nowrap" }}>Your Score</Typography>
          <Slider
            value={score}
            onChange={(_, value) => setScore(value as number)}
            min={0}
            max={10}
            step={1}
            size="small"
            sx={{ color: "primary.main", flex: 1, minWidth: "180px" }}
          />
          <Typography sx={{ fontSize: "14px", color: "#ffffff", width: "24px" }}>{score}</Typography>
          <Button variant="contained" disabled={score < 1 || setRating.isPending} onClick={() => setRating.mutate(score)}>
            {rating?.myScore === null ? "Rate" : "Update"}
          </Button>
          {rating?.myScore !== null && rating !== undefined && (
            <Button variant="outlined" disabled={removeRating.isPending} onClick={() => removeRating.mutate()}>
              Clear
            </Button>
          )}
        </Box>
      )}

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
          <Typography sx={{ fontSize: "16px", fontWeight: 600 }}>
            {isSignedIn ? "Post a comment for this title:" : "Sign in to leave a comment."}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>Contains spoilers</Typography>
            <Switch checked={hasSpoiler} onChange={(e) => setHasSpoiler(e.target.checked)} size="small" disabled={!isSignedIn} />
          </Box>
        </Box>

        <Box
          component="textarea"
          value={text}
          disabled={!isSignedIn}
          onChange={(e) => setText((e.target as HTMLTextAreaElement).value)}
          placeholder="Comment Text ..."
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
            disabled={!isSignedIn || !text.trim() || createComment.isPending}
            sx={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            Post Comment
            <ForumIcon sx={{ fontSize: "18px" }} />
          </Button>
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
        <Typography sx={{ fontSize: "14px", color: "text.secondary", ml: "auto" }}>({formatCount(totalCount)})</Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {isPending && <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>Loading comments ...</Typography>}
        {!isPending && comments.length === 0 && (
          <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>No comments yet — be the first.</Typography>
        )}
        {comments.map((comment) => (
          <CommentCard key={comment.id} comment={comment} titleId={title.id} />
        ))}
      </Box>

      {hasNextPage && (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button
            variant="outlined"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
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
