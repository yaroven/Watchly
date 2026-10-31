"use client";

import { useSetTitleWatchlist } from "@/features/title-engagement";
import { ExternalRatingSource, type Title } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import { BookmarkBorder as BookmarkBorderIcon, Bookmark as BookmarkIcon, Star as StarIcon } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { APP } from "@shared/lib/routes";
import { useViewer } from "@shared/lib/use-viewer";
import Image from "next/image";
import { useRouter } from "next/navigation";

type TitleProps = Pick<Title, "id" | "name" | "posterUrl" | "type" | "genres" | "externalRatings" | "engagement"> & {
  onClick: () => void;
};

export default function TitleCard({ id, name, posterUrl, type, genres, externalRatings, engagement, onClick }: TitleProps) {
  const posterSrc = getOptimizedImageSrc(posterUrl);
  const subtitle = genres.length ? genres.map((genre) => genre.name).join(", ") : type === "MOVIE" ? "Movie" : "Series";
  const rating = externalRatings.find((r) => r.source === ExternalRatingSource.IMDB)?.rating;

  const router = useRouter();
  const viewer = useViewer();
  const setWatchlist = useSetTitleWatchlist(id);
  const failed = setWatchlist.isError;

  const saved = engagement.viewer?.inWatchlist ?? null;
  const stateUnknown = viewer.status === "signed-in" && saved === null;

  const toggleWatchlist = (event: { stopPropagation: () => void; preventDefault: () => void }) => {
    event.stopPropagation();
    event.preventDefault();
    if (setWatchlist.isPending || viewer.status === "pending" || stateUnknown) return;
    if (viewer.status === "anonymous") {
      router.push(APP.LOGIN);
      return;
    }
    setWatchlist.mutate(!saved);
  };

  const toggleLabel = failed
    ? "Could not update your watchlist — try again"
    : viewer.status === "pending"
      ? "Watchlist — still signing you in"
      : stateUnknown
        ? "Watchlist — could not tell whether this is saved"
        : viewer.status === "anonymous"
          ? "Sign in to add to your watchlist"
          : saved
            ? "Remove from watchlist"
            : "Add to watchlist";

  return (
    <Card
      variant="poster"
      sx={{
        position: "relative",
        width: "clamp(150px, 13vw, 260px)",
        display: "block",
        textAlign: "left",
        "&:has(.title-card-open:focus-visible)": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
        },
      }}
    >
      <Box
        component="button"
        type="button"
        className="title-card-open"
        onClick={onClick}
        aria-label={name}
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          border: "none",
          padding: 0,
          background: "none",
          cursor: "pointer",
          font: "inherit",
          "&:focus-visible": { outline: "none" },
        }}
      />
      <Box
        sx={{
          position: "relative",
          borderRadius: "8px",
          overflow: "hidden",
          aspectRatio: "177 / 246",
        }}
      >
        <Image
          src={posterSrc}
          alt=""
          fill
          sizes="(max-width: 900px) 150px, (max-width: 2200px) 13vw, 260px"
          style={{ objectFit: "cover" }}
        />

        {rating !== undefined && (
          <Box
            sx={{
              position: "absolute",
              top: 6,
              left: 6,
              display: "flex",
              alignItems: "center",
              gap: "2px",
              px: "4px",
              py: "2px",
              borderRadius: "8px",
              bgcolor: "rgba(25,25,25,.55)",
              backdropFilter: "blur(12px)",
            }}
          >
            <StarIcon sx={{ fontSize: "16px", color: "#e7bc0f" }} />
            <Typography component="span" sx={{ fontSize: 12, fontWeight: 400, color: "#ffffff" }}>
              {rating.toFixed(1)}
            </Typography>
            <Typography component="span" sx={{ fontSize: 10, fontWeight: 400, color: "#b2b2b2" }}>
              /10
            </Typography>
          </Box>
        )}

        <Box
          component="span"
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            zIndex: 2,
            width: 32,
            height: 32,
            borderBottomLeftRadius: "8px",
            bgcolor: "#333333",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            component="button"
            type="button"
            aria-label={toggleLabel}
            aria-pressed={saved === null ? undefined : saved}
            aria-busy={setWatchlist.isPending}
            onClick={toggleWatchlist}
            sx={{
              position: "absolute",
              inset: 0,
              borderRadius: "8px",
              border: "none",
              padding: 0,
              bgcolor: "#ffffff1a",
              cursor: viewer.status === "pending" || stateUnknown ? "default" : "pointer",
              opacity: viewer.status === "anonymous" || stateUnknown ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {saved ? (
              <BookmarkIcon sx={{ fontSize: "12px", color: failed ? "error.main" : "primary.main" }} />
            ) : (
              <BookmarkBorderIcon sx={{ fontSize: "12px", color: failed ? "error.main" : "#ffffff" }} />
            )}
          </Box>
        </Box>

        {failed && (
          <Box
            role="status"
            sx={{
              position: "absolute",
              top: 32,
              right: 0,
              left: 0,
              zIndex: 3,
              px: "6px",
              py: "4px",
              bgcolor: "error.main",
              color: "#ffffff",
              fontSize: 10,
              lineHeight: 1.3,
              textAlign: "center",
            }}
          >
            Could not save — tap to retry
          </Box>
        )}

        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            px: 1.5,
            py: 1.25,
            textAlign: "center",
            bgcolor: "rgba(229,229,229,.14)",
            backdropFilter: "blur(16px)",
          }}
        >
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: "#ffffff",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </Typography>
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 400,
              color: "#e5e5e5",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {subtitle}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}
