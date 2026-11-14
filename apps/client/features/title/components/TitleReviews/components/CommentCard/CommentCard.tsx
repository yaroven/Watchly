"use client";

import {
  type Comment,
  ReactionType,
  useCommentReplies,
  useCreateComment,
  useDeleteComment,
  useReportComment,
  useSetCommentReaction,
} from "@/features/comment";
import { FeatureGate } from "@/features/feature-flags";
import Role from "@/types/role";
import { ThumbDown as DislikeIcon, ThumbUp as LikeIcon, ChatBubble as ReplyIcon } from "@mui/icons-material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useAuthStore } from "@shared/lib/auth-store";
import { formatCount } from "@shared/lib/format-count";
import { tokens } from "@shared/mui/theme";
import Avatar from "@shared/ui/Avatar";
import Button from "@shared/ui/Button";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

interface CommentCardProps {
  comment: Comment;
  titleId: string;
  depth?: number;
}

const FALLBACK_AVATAR = "https://picsum.photos/id/1074/120/120";

function relativeTimeArgs(postedAt: Date): [Date, { now: Date; unit: "minute" | "hour" | "day" }] {
  const now = new Date();
  const diffMs = now.getTime() - postedAt.getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  const at = new Date(now.getTime() - minutes * 60000);
  if (minutes < 60) return [at, { now, unit: "minute" }];
  const hours = Math.round(minutes / 60);
  if (hours < 24) return [at, { now, unit: "hour" }];
  return [at, { now, unit: "day" }];
}

export default function CommentCard({ comment, titleId, depth = 0 }: CommentCardProps) {
  const t = useTranslations("title.reviews.comment");
  const format = useFormatter();
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

  const react = useSetCommentReaction();
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
    react.mutate({ commentId: comment.id, type: comment.myReaction === type ? null : type });
  };

  const isReply = depth > 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Box
        sx={{
          position: "relative",
          display: "flex",
          gap: "16px",
          borderRadius: CARD_RADIUS,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: isReply ? "transparent" : tokens.surface.default,
          p: isReply ? "16px" : "20px",
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
              borderRadius: CARD_RADIUS,
              backgroundColor: "rgba(10,10,10,.92)",
              backdropFilter: "blur(6px)",
            }}
          >
            <WarningAmberIcon sx={{ color: "primary.main", fontSize: "24px" }} />
            <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "primary.main" }}>{t("spoilerWarning")}</Typography>
            <Button variant="outlined" onClick={() => setSpoilerRevealed(true)} sx={{ paddingBlock: "6px", minHeight: "unset" }}>
              {t("view")}
            </Button>
          </Box>
        )}

        <Avatar src={comment.author.avatarUrl ?? FALLBACK_AVATAR} alt={comment.author.name} size={isReply ? 36 : 48} />
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: isReply ? "15px" : "16px", fontWeight: 600 }}>{comment.author.name}</Typography>
            {comment.author.score !== null && (
              <Box sx={{ px: "10px", py: "2px", borderRadius: "999px", border: "1px solid", borderColor: "primary.main" }}>
                <Typography sx={{ fontSize: "12px", fontWeight: 600, color: "primary.main", whiteSpace: "nowrap" }}>
                  {comment.author.score}/10
                </Typography>
              </Box>
            )}
            <Typography sx={{ fontSize: "13px", color: "text.secondary", whiteSpace: "nowrap", ml: "auto" }}>
              {format.relativeTime(...relativeTimeArgs(comment.createdAt))}
            </Typography>
          </Box>

          <Typography sx={{ fontSize: "15px", color: tokens.text.field, lineHeight: 1.6, overflowWrap: "anywhere" }}>
            {comment.text}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
            <FeatureGate flag="reactions">
              <Box
                component="button"
                type="button"
                aria-label={comment.myReaction === ReactionType.LIKE ? t("removeLike") : t("like")}
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
                aria-label={comment.myReaction === ReactionType.DISLIKE ? t("removeDislike") : t("dislike")}
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
            </FeatureGate>
            {comment.replyCount > 0 && (
              <Box
                component="button"
                type="button"
                aria-label={expanded ? t("hideReplies") : t("showReplies")}
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
                  {t("reply")}
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
                    {t("delete")}
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
                  {reported ? t("reported") : t("report")}
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
                placeholder={t("replyPlaceholder", { name: comment.author.name })}
                sx={{
                  flex: 1,
                  minHeight: "64px",
                  resize: "vertical",
                  borderRadius: "12px",
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "transparent",
                  color: tokens.text.field,
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
                {t("send")}
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {replies.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            ml: "24px",
            pl: "24px",
            borderLeft: "1px solid",
            borderColor: "divider",
          }}
        >
          {replies.map((reply) => (
            <CommentCard key={reply.id} comment={reply} titleId={titleId} depth={depth + 1} />
          ))}
        </Box>
      )}
    </Box>
  );
}

const CARD_RADIUS = "16px";

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
