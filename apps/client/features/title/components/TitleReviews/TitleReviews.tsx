"use client";

import { type CommentSortMode, useComments, useCreateComment } from "@/features/comment";
import { useRemoveTitleRating, useSetTitleRating, useTitleEngagement } from "@/features/title-engagement";
import type { Title } from "@/features/title/schemas/title";
import { useRouter } from "@/i18n/navigation";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ForumIcon from "@mui/icons-material/Forum";
import SortIcon from "@mui/icons-material/Sort";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useApiErrorMessage } from "@shared/api/use-api-error-message";
import { INLINE_ERROR } from "@shared/api/write-errors";
import { formatCount } from "@shared/lib/format-count";
import { useLoginPath } from "@shared/lib/use-login-path";
import { useViewer } from "@shared/lib/use-viewer";
import { viewerControl } from "@shared/lib/viewer-control";
import { tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import { useTranslations } from "next-intl";
import { useState } from "react";
import CommentCard from "./components/CommentCard";

interface TitleReviewsProps {
  title: Title;
}

const SORT_OPTIONS: CommentSortMode[] = ["newest", "oldest", "hottest"];

const PAGE_SIZE = 5;

export default function TitleReviews({ title }: TitleReviewsProps) {
  const t = useTranslations("title.reviews");
  const describeError = useApiErrorMessage();
  const viewer = useViewer();
  const router = useRouter();
  const signInPath = useLoginPath();
  const sessionReady = viewer.status !== "pending";

  const [sortMode, setSortMode] = useState<CommentSortMode>("newest");
  const [text, setText] = useState("");
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [score, setScore] = useState(0);

  const { data: engagement, isError: engagementFailed } = useTitleEngagement(title.id);
  const setRating = useSetTitleRating(title.id, { meta: INLINE_ERROR });
  const removeRating = useRemoveTitleRating(title.id, { meta: INLINE_ERROR });
  const ratingControl = viewerControl({
    viewer: viewer.status,
    known: engagement?.viewer != null,
    refreshFailed: engagementFailed,
    busy: setRating.isPending || removeRating.isPending,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError: commentsFailed,
  } = useComments(title.id, sortMode, PAGE_SIZE, sessionReady);
  const comments = data?.pages.flatMap((page) => page.items) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  const createComment = useCreateComment(title.id, {
    meta: INLINE_ERROR,
    onSuccess: () => {
      setText("");
      setHasSpoiler(false);
    },
  });

  const [syncedScore, setSyncedScore] = useState<number | null>(null);
  const myScore = engagement?.viewer?.score ?? null;
  if (engagement?.viewer != null && syncedScore !== myScore) {
    setSyncedScore(myScore);
    setScore(myScore ?? 0);
  }

  const ratingError = describeError(setRating.error ?? removeRating.error);
  const commentError = describeError(createComment.error);

  const composeControl = viewerControl({ viewer: viewer.status, known: true, busy: createComment.isPending });
  const canWrite = composeControl.state === "ready";

  const handleSubmit = () => {
    if (composeControl.intent === "sign-in") return router.push(signInPath());
    if (composeControl.intent !== "write" || !text.trim()) return;
    createComment.mutate({ text: text.trim(), hasSpoiler });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: "16px", flexWrap: "wrap" }}>
        <Typography variant="h3">{t("heading")}</Typography>
        <Typography sx={{ fontSize: "15px", color: "text.secondary" }}>
          {engagement?.averageScore == null
            ? t("notRated")
            : t("averageScore", {
                score: engagement.averageScore,
                count: engagement.ratingCount,
                formatted: formatCount(engagement.ratingCount),
              })}
        </Typography>
      </Box>

      {(ratingControl.state === "ready" || ratingControl.state === "unknown") && (
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
          <Typography sx={{ fontSize: "16px", fontWeight: 600, whiteSpace: "nowrap" }}>{t("yourScore")}</Typography>
          <Slider
            value={score}
            onChange={(_, value) => setScore(value as number)}
            min={0}
            max={10}
            step={1}
            size="small"
            sx={{ color: "primary.main", flex: 1, minWidth: "180px" }}
          />
          <Typography sx={{ fontSize: "14px", color: tokens.text.primary, width: "24px" }}>{score}</Typography>
          <Button variant="contained" disabled={score < 1 || ratingControl.disabled} onClick={() => setRating.mutate(score)}>
            {myScore === null ? t("rate") : t("update")}
          </Button>
          {myScore !== null && (
            <Button variant="outlined" disabled={ratingControl.disabled} onClick={() => removeRating.mutate()}>
              {t("clear")}
            </Button>
          )}
          {ratingError && (
            <Alert severity="error" variant="outlined" sx={{ flexBasis: "100%" }}>
              {t("writeError", { message: ratingError })}
            </Alert>
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
            {composeControl.state === "anonymous" ? t("signInPrompt") : t("postPrompt")}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>{t("containsSpoilers")}</Typography>
            <Switch checked={hasSpoiler} onChange={(e) => setHasSpoiler(e.target.checked)} size="small" disabled={!canWrite} />
          </Box>
        </Box>

        <Box
          component="textarea"
          value={text}
          disabled={!canWrite}
          onChange={(e) => setText((e.target as HTMLTextAreaElement).value)}
          placeholder={t("commentPlaceholder")}
          sx={{
            width: "100%",
            minHeight: "140px",
            resize: "vertical",
            borderRadius: "12px",
            border: "1px solid",
            borderColor: "primary.main",
            backgroundColor: "transparent",
            color: tokens.text.field,
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
            disabled={composeControl.disabled || (composeControl.intent === "write" && !text.trim())}
            sx={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            {t("postComment")}
            <ForumIcon sx={{ fontSize: "18px" }} />
          </Button>
        </Box>
        {commentError && (
          <Alert severity="error" variant="outlined">
            {t("writeError", { message: commentError })}
          </Alert>
        )}
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
        <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>{t("sortBy")}</Typography>
        {SORT_OPTIONS.map((key) => (
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
            {t(`sort.${key}`)}
          </Box>
        ))}
        <Typography sx={{ fontSize: "14px", color: "text.secondary", ml: "auto" }}>({formatCount(totalCount)})</Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {isPending && <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>{t("loading")}</Typography>}
        {!isPending && comments.length === 0 && <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>{t("empty")}</Typography>}
        {comments.map((comment) => (
          <CommentCard key={comment.id} comment={comment} titleId={title.id} listRefreshFailed={commentsFailed} />
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
            {t("showMore")}
            <ExpandMore sx={{ fontSize: "18px" }} />
          </Button>
        </Box>
      )}
    </Box>
  );
}
