"use client";

import { useWatchlist } from "@/features/title-engagement";
import { useRouter } from "@/i18n/navigation";
import { APP } from "@/shared/lib/routes";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { useApiErrorMessage } from "@shared/api/use-api-error-message";
import { formatCount } from "@shared/lib/format-count";
import { useClampedPage, useSearchPageParams } from "@shared/lib/list-state";
import { useLoginPath } from "@shared/lib/use-login-path";
import { useViewer } from "@shared/lib/use-viewer";
import Button from "@shared/ui/Button";
import Pagination from "@shared/ui/Pagination";
import { useTranslations } from "next-intl";
import TitleCard from "../TitleCard";

const PAGE_SIZE = 12;

const iconSx = { fontSize: "40px", color: "text.secondary" } as const;

const gridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: "24px",
  justifyItems: "start",
} as const;

export default function WatchlistScreen() {
  const t = useTranslations("title.watchlist");
  const describeError = useApiErrorMessage();
  const router = useRouter();
  const signInPath = useLoginPath();
  const viewer = useViewer();
  const { page, setPage } = useSearchPageParams();

  const { data, isPending, isError, error, refetch, isFetching } = useWatchlist({ page, limit: PAGE_SIZE });
  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  useClampedPage(page, data?.totalCount, PAGE_SIZE, setPage);

  if (viewer.status === "anonymous") {
    return (
      <EmptyState message={t("signInPrompt")}>
        <Button variant="contained" onClick={() => router.push(signInPath())}>
          {t("signIn")}
        </Button>
      </EmptyState>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "32px", pb: "64px" }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: "16px", flexWrap: "wrap" }}>
        <Typography variant="h3">{t("heading")}</Typography>
        {totalCount > 0 && (
          <Typography sx={{ fontSize: "15px", color: "text.secondary" }}>
            {t("count", { count: totalCount, formatted: formatCount(totalCount) })}
          </Typography>
        )}
      </Box>

      {isPending && !isError && (
        <Box sx={gridSx}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              sx={{ width: "clamp(150px, 13vw, 260px)", aspectRatio: "177 / 246", borderRadius: "8px", bgcolor: "#232323" }}
            />
          ))}
        </Box>
      )}

      {isError && (
        <EmptyState message={t("loadError", { message: describeError(error) ?? "" })} icon={<ErrorOutlineIcon sx={iconSx} />}>
          <Button variant="outlined" disabled={isFetching} onClick={() => void refetch()}>
            {t("tryAgain")}
          </Button>
        </EmptyState>
      )}

      {!isPending && !isError && items.length === 0 && (
        <EmptyState message={t("empty")}>
          <Button variant="outlined" onClick={() => router.push(APP.DISCOVER)}>
            {t("browse")}
          </Button>
        </EmptyState>
      )}

      {items.length > 0 && (
        <Box sx={gridSx}>
          {items.map((title) => (
            <TitleCard key={title.id} {...title} onClick={() => router.push(APP.TITLE(title.id))} />
          ))}
        </Box>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={(next) => setPage(Number(next))} />
    </Box>
  );
}

function EmptyState({ message, children, icon }: { message: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        py: "80px",
        borderRadius: "16px",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      {icon ?? <BookmarkBorderIcon sx={iconSx} />}
      <Typography sx={{ color: "text.secondary" }}>{message}</Typography>
      {children}
    </Box>
  );
}
