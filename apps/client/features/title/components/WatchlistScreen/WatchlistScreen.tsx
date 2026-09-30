"use client";

import { useWatchlist } from "@/features/title-engagement";
import { APP } from "@/shared/lib/routes";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { useAuthStore } from "@shared/lib/auth-store";
import { formatCount } from "@shared/lib/format-count";
import Button from "@shared/ui/Button";
import Pagination from "@shared/ui/Pagination";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const router = useRouter();
  const isSignedIn = useAuthStore((state) => Boolean(state.userId));
  const authStatus = useAuthStore((state) => state.status);
  const [page, setPage] = useState(1);

  const { data, isPending, isError, error, refetch, isFetching } = useWatchlist({ page, limit: PAGE_SIZE });
  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (authStatus === "resolved" && !isSignedIn) {
    return (
      <EmptyState message="Sign in to keep a watchlist.">
        <Button variant="contained" onClick={() => router.push(APP.LOGIN)}>
          Sign in
        </Button>
      </EmptyState>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "32px", pb: "64px" }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: "16px", flexWrap: "wrap" }}>
        <Typography variant="h3">My Watchlist</Typography>
        {totalCount > 0 && (
          <Typography sx={{ fontSize: "15px", color: "text.secondary" }}>
            {formatCount(totalCount)} {totalCount === 1 ? "title" : "titles"}
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

      {/* A failed load must never read as an empty watchlist — someone whose forty
          saved titles did not arrive would be told they never saved anything. */}
      {isError && (
        <EmptyState message={`Could not load your watchlist: ${error.message}`} icon={<ErrorOutlineIcon sx={iconSx} />}>
          <Button variant="outlined" disabled={isFetching} onClick={() => void refetch()}>
            Try again
          </Button>
        </EmptyState>
      )}

      {!isPending && !isError && items.length === 0 && (
        <EmptyState message="Nothing saved yet. The bookmark on any poster puts it here.">
          <Button variant="outlined" onClick={() => router.push(APP.DISCOVER)}>
            Browse titles
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
