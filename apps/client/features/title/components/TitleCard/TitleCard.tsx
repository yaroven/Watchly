"use client";

import { useSetTitleWatchlist } from "@/features/title-engagement";
import { ExternalRatingSource, type Title } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import { BookmarkBorder as BookmarkBorderIcon, Bookmark as BookmarkIcon, Star as StarIcon } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { useViewer } from "@shared/lib/use-viewer";
import Image from "next/image";
import { useState } from "react";

/**
 * Only the fields the card draws, so adding a column to `Title` cannot silently
 * change this component's contract. Callers may still spread a whole Title.
 */
type TitleProps = Pick<Title, "id" | "name" | "posterUrl" | "type" | "genres" | "externalRatings" | "engagement"> & {
  onClick: () => void;
};

export default function TitleCard({ id, name, posterUrl, type, genres, externalRatings, engagement, onClick }: TitleProps) {
  const posterSrc = getOptimizedImageSrc(posterUrl);
  const subtitle = genres.length ? genres.map((genre) => genre.name).join(", ") : type === "MOVIE" ? "Movie" : "Series";
  const rating = externalRatings.find((r) => r.source === ExternalRatingSource.IMDB)?.rating;

  // `isSignedIn` waits for the session: during the boot exchange `userId` is still
  // null for someone who is in fact signed in, and a control disabled then is
  // indistinguishable from one disabled for good.
  const { isSignedIn, sessionReady } = useViewer();
  const [failed, setFailed] = useState(false);
  const setWatchlist = useSetTitleWatchlist(id, {
    onError: (error) => {
      console.error(`Failed to update the watchlist for title ${id}`, error);
      setFailed(true);
    },
    onSuccess: () => setFailed(false),
  });
  const inWatchlist = engagement.inWatchlist;

  const toggleWatchlist = (event: { stopPropagation: () => void; preventDefault?: () => void }) => {
    event.stopPropagation();
    event.preventDefault?.();
    if (!isSignedIn || setWatchlist.isPending) return;
    setWatchlist.mutate(!inWatchlist);
  };

  const toggleLabel = failed ? "Could not update the watchlist — try again" : inWatchlist ? "Remove from watchlist" : "Add to watchlist";

  return (
    // The card is not itself a button: it holds a second control (the watchlist
    // toggle), and a button may not contain another interactive element — nesting
    // one hides it from assistive tech and makes its focus order unreliable. The
    // "open title" affordance is a sibling button stretched over the card instead.
    <Card
      variant="poster"
      sx={{
        // Grows smoothly with the viewport instead of stepping, so a row of
        // cards never changes size all at once. 193 is the 1440-wide design.
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
            aria-pressed={inWatchlist}
            disabled={!isSignedIn || setWatchlist.isPending}
            onClick={toggleWatchlist}
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 24,
              height: 24,
              // Same fill as the card frame, so the button reads as a notch
              // cut out of the poster rather than a chip floating on top of it.
              borderRadius: "8px",
              border: "none",
              padding: 0,
              bgcolor: "#ffffff1a",
              cursor: isSignedIn ? "pointer" : "default",
              opacity: sessionReady ? 1 : 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {inWatchlist ? (
              <BookmarkIcon sx={{ fontSize: "12px", color: failed ? "error.main" : "primary.main" }} />
            ) : (
              <BookmarkBorderIcon sx={{ fontSize: "12px", color: failed ? "error.main" : "#ffffff" }} />
            )}
          </Box>
        </Box>

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
