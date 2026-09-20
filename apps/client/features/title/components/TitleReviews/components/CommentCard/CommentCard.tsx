"use client";

import { ThumbDown as DislikeIcon, ThumbUp as LikeIcon, ChatBubble as ReplyIcon } from "@mui/icons-material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { formatCount } from "@shared/lib/format-count";
import Button from "@shared/ui/Button";
import Avatar from "@shared/ui/Header/components/Avatar";
import { useState } from "react";
import type { ReviewComment } from "../../../TitleOverview/mocks";

interface CommentCardProps {
  comment: ReviewComment;
  depth?: number;
  repliedToAuthor?: string;
}

function formatRelativeTime(postedAt: Date) {
  const diffMs = Date.now() - postedAt.getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function CommentCard({ comment, depth = 0, repliedToAuthor }: CommentCardProps) {
  // PLACEHOLDER: like/dislike/report react only to local state — no backend call, nothing persists.
  const [likes, setLikes] = useState(comment.likes);
  const [dislikes, setDislikes] = useState(comment.dislikes);
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(null);
  const [showReplies, setShowReplies] = useState(true);
  const [spoilerRevealed, setSpoilerRevealed] = useState(!comment.hasSpoiler);

  const handleLike = () => {
    if (reaction === "like") {
      setLikes((value) => value - 1);
      setReaction(null);
      return;
    }
    setLikes((value) => value + 1);
    if (reaction === "dislike") setDislikes((value) => value - 1);
    setReaction("like");
  };

  const handleDislike = () => {
    if (reaction === "dislike") {
      setDislikes((value) => value - 1);
      setReaction(null);
      return;
    }
    setDislikes((value) => value + 1);
    if (reaction === "like") setLikes((value) => value - 1);
    setReaction("dislike");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px", ml: depth > 0 ? "72px" : 0 }}>
      <Box
        sx={{
          position: "relative",
          display: "flex",
          gap: "16px",
          ...(depth > 0 && { border: "1px solid", borderColor: "divider", borderRadius: "16px", p: "16px" }),
        }}
      >
        {!spoilerRevealed && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              borderRadius: "16px",
              backgroundColor: "rgba(10,10,10,.92)",
              backdropFilter: "blur(6px)",
            }}
          >
            <WarningAmberIcon sx={{ color: "primary.main", fontSize: "24px" }} />
            <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "primary.main" }}>This comment contains spoilers!</Typography>
            <Button variant="outlined" onClick={() => setSpoilerRevealed(true)} sx={{ paddingBlock: "6px", minHeight: "unset" }}>
              View
            </Button>
          </Box>
        )}

        <Avatar src={comment.avatarUrl} alt={comment.author} />
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: "16px", fontWeight: 600 }}>{comment.author}</Typography>
            {repliedToAuthor && (
              <Typography component="span" sx={{ fontSize: "13px", color: "primary.main" }}>
                Replied to: @{repliedToAuthor.replace(/\s+/g, "")}
              </Typography>
            )}
          </Box>

          <Typography sx={{ fontSize: "15px", color: "#e5e5e5" }}>{comment.text}</Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <Box
              component="button"
              type="button"
              onClick={handleLike}
              sx={{ ...reactionButtonSx, color: reaction === "like" ? "primary.main" : "text.secondary" }}
            >
              <LikeIcon sx={{ fontSize: "18px" }} />
              <Typography component="span" sx={{ fontSize: "13px" }}>
                {formatCount(likes)}
              </Typography>
            </Box>
            <Box
              component="button"
              type="button"
              onClick={handleDislike}
              sx={{ ...reactionButtonSx, color: reaction === "dislike" ? "primary.main" : "text.secondary" }}
            >
              <DislikeIcon sx={{ fontSize: "18px" }} />
              <Typography component="span" sx={{ fontSize: "13px" }}>
                {formatCount(dislikes)}
              </Typography>
            </Box>
            {!!comment.replies?.length && (
              <Box component="button" type="button" onClick={() => setShowReplies((value) => !value)} sx={reactionButtonSx}>
                <ReplyIcon sx={{ fontSize: "18px" }} />
                <Typography component="span" sx={{ fontSize: "13px" }}>
                  {formatCount(comment.replies.length)}
                </Typography>
              </Box>
            )}
            {/* PLACEHOLDER: no onClick — needs a report-comment endpoint */}
            <Box component="button" type="button" sx={{ ...reactionButtonSx, ml: "auto" }}>
              <Typography component="span" sx={{ fontSize: "13px" }}>
                Report
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
          <Typography sx={{ fontSize: "13px", color: "text.secondary", whiteSpace: "nowrap" }}>
            {formatRelativeTime(comment.postedAt)}
          </Typography>
          <Box
            sx={{
              px: "12px",
              py: "4px",
              borderRadius: "999px",
              border: "1px solid",
              borderColor: "primary.main",
            }}
          >
            <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "primary.main", whiteSpace: "nowrap" }}>
              Score: {comment.score}/10
            </Typography>
          </Box>
        </Box>
      </Box>

      {showReplies &&
        comment.replies?.map((reply) => <CommentCard key={reply.id} comment={reply} depth={depth + 1} repliedToAuthor={comment.author} />)}
    </Box>
  );
}

const reactionButtonSx = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  border: "none",
  background: "none",
  font: "inherit",
  cursor: "pointer",
  padding: 0,
  color: "text.secondary",
  transition: "color .15s ease-out",
  ":hover": { color: "primary.main" },
} as const;
