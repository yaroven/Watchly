"use client";

import {
  type Comment,
  ReactionType,
  useCommentReplies,
  useCreateComment,
  useDeleteComment,
  useReactToComment,
  useReportComment,
} from "@/features/comment";
import Role from "@/types/role";
import { ThumbDown as DislikeIcon, ThumbUp as LikeIcon, ChatBubble as ReplyIcon } from "@mui/icons-material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useAuthStore } from "@shared/lib/auth-store";
import { formatCount } from "@shared/lib/format-count";
import Button from "@shared/ui/Button";
import Avatar from "@shared/ui/Header/components/Avatar";
import { useState } from "react";

interface CommentCardProps {
  comment: Comment;
  titleId: string;
  depth?: number;
  repliedToAuthor?: string;
}

const FALLBACK_AVATAR = "https://picsum.photos/id/1074/120/120";

function formatRelativeTime(postedAt: Date) {
  const diffMs = Date.now() - postedAt.getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function CommentCard({ comment, titleId, depth = 0, repliedToAuthor }: CommentCardProps) {
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);
  const status = useAuthStore((state) => state.status);
  const isSignedIn = Boolean(userId);
  const canDelete = status === "resolved" && (comment.author.id === userId || role === Role.ADMIN);

  const [expanded, setExpanded] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [reported, setReported] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(!comment.hasSpoiler);

  const react = useReactToComment();
  const report = useReportComment({ onSuccess: () => setReported(true) });
  const remove = useDeleteComment(titleId);
  const createReply = useCreateComment(titleId, {
    onSuccess: () => {
      setReplyText("");
      setReplyOpen(false);
      setExpanded(true);
    },
  });

  const hasMoreReplies = comment.replyCount > comment.replies.length;
  const { data: fetchedReplies } = useCommentReplies(comment.id, { enabled: expanded && hasMoreReplies });
  const replies = expanded ? (fetchedReplies?.items ?? comment.replies) : [];

  const handleReact = (type: ReactionType) => {
    if (!isSignedIn) return;
    react.mutate({ commentId: comment.id, type });
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

        <Avatar src={comment.author.avatarUrl ?? FALLBACK_AVATAR} alt={comment.author.name} />
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: "16px", fontWeight: 600 }}>{comment.author.name}</Typography>
            {repliedToAuthor && (
              <Typography component="span" sx={{ fontSize: "13px", color: "primary.main" }}>
                Replied to: @{repliedToAuthor.replace(/\s+/g, "")}
              </Typography>
            )}
          </Box>

          <Typography sx={{ fontSize: "15px", color: "#e5e5e5" }}>{comment.text}</Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
            <Box
              component="button"
              type="button"
              aria-label={comment.myReaction === ReactionType.LIKE ? "Remove like" : "Like"}
              aria-pressed={comment.myReaction === ReactionType.LIKE}
              disabled={!isSignedIn || react.isPending}
              onClick={() => handleReact(ReactionType.LIKE)}
              sx={{ ...reactionButtonSx, color: comment.myReaction === ReactionType.LIKE ? "primary.main" : "text.secondary" }}
            >
              <LikeIcon sx={{ fontSize: "18px" }} />
              <Typography component="span" sx={{ fontSize: "13px" }}>
                {formatCount(comment.likes)}
              </Typography>
            </Box>
            <Box
              component="button"
              type="button"
              aria-label={comment.myReaction === ReactionType.DISLIKE ? "Remove dislike" : "Dislike"}
              aria-pressed={comment.myReaction === ReactionType.DISLIKE}
              disabled={!isSignedIn || react.isPending}
              onClick={() => handleReact(ReactionType.DISLIKE)}
              sx={{ ...reactionButtonSx, color: comment.myReaction === ReactionType.DISLIKE ? "primary.main" : "text.secondary" }}
            >
              <DislikeIcon sx={{ fontSize: "18px" }} />
              <Typography component="span" sx={{ fontSize: "13px" }}>
                {formatCount(comment.dislikes)}
              </Typography>
            </Box>
            {comment.replyCount > 0 && (
              <Box
                component="button"
                type="button"
                aria-label={expanded ? "Hide replies" : "Show replies"}
                aria-expanded={expanded}
                onClick={() => setExpanded((value) => !value)}
                sx={reactionButtonSx}
              >
                <ReplyIcon sx={{ fontSize: "18px" }} />
                <Typography component="span" sx={{ fontSize: "13px" }}>
                  {formatCount(comment.replyCount)}
                </Typography>
              </Box>
            )}
            {depth === 0 && isSignedIn && (
              <Box component="button" type="button" onClick={() => setReplyOpen((value) => !value)} sx={reactionButtonSx}>
                <Typography component="span" sx={{ fontSize: "13px" }}>
                  Reply
                </Typography>
              </Box>
            )}

            <Box sx={{ display: "flex", alignItems: "center", gap: "16px", ml: "auto" }}>
              {canDelete && (
                <Box
                  component="button"
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(comment.id)}
                  sx={reactionButtonSx}
                >
                  <DeleteOutlineIcon sx={{ fontSize: "18px" }} />
                  <Typography component="span" sx={{ fontSize: "13px" }}>
                    Delete
                  </Typography>
                </Box>
              )}
              <Box
                component="button"
                type="button"
                disabled={!isSignedIn || reported || report.isPending}
                onClick={() => report.mutate({ commentId: comment.id })}
                sx={reactionButtonSx}
              >
                <Typography component="span" sx={{ fontSize: "13px" }}>
                  {reported ? "Reported" : "Report"}
                </Typography>
              </Box>
            </Box>
          </Box>

          {replyOpen && (
            <Box sx={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <Box
                component="textarea"
                value={replyText}
                onChange={(e) => setReplyText((e.target as HTMLTextAreaElement).value)}
                placeholder={`Reply to ${comment.author.name} ...`}
                sx={{
                  flex: 1,
                  minHeight: "64px",
                  resize: "vertical",
                  borderRadius: "12px",
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "transparent",
                  color: "#e5e5e5",
                  padding: "10px",
                  font: "inherit",
                  fontSize: "14px",
                  "&::placeholder": { color: "text.secondary" },
                }}
              />
              <Button
                variant="contained"
                disabled={!replyText.trim() || createReply.isPending}
                onClick={() => createReply.mutate({ text: replyText.trim(), parentId: comment.id })}
              >
                Send
              </Button>
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
          <Typography sx={{ fontSize: "13px", color: "text.secondary", whiteSpace: "nowrap" }}>
            {formatRelativeTime(comment.createdAt)}
          </Typography>
          {comment.author.score !== null && (
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
                Score: {comment.author.score}/10
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {replies.map((reply) => (
        <CommentCard key={reply.id} comment={reply} titleId={titleId} depth={depth + 1} repliedToAuthor={comment.author.name} />
      ))}
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
  ":disabled": { cursor: "default", opacity: 0.6 },
} as const;
