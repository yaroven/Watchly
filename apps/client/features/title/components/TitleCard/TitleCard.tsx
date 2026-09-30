"use client";

import { EMPTY_ENGAGEMENT, useSetTitleWatchlist } from "@/features/title-engagement";
import { ExternalRatingSource, type Title } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import { Favorite as FavoriteIcon, Star as StarIcon } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { useAuthStore } from "@shared/lib/auth-store";
import Image from "next/image";

interface TitleProps extends Omit<Title, "seasons"> {
  onClick: () => void;
}

export default function TitleCard({ id, name, posterUrl, type, genres, externalRatings, engagement, onClick }: TitleProps) {
  const posterSrc = getOptimizedImageSrc(posterUrl);
  const subtitle = genres.length ? genres.map((genre) => genre.name).join(", ") : type === "MOVIE" ? "Movie" : "Series";
  const rating = externalRatings.find((r) => r.source === ExternalRatingSource.IMDB)?.rating;

  const isSignedIn = useAuthStore((state) => Boolean(state.userId));
  const setWatchlist = useSetTitleWatchlist(id);
  const inWatchlist = (engagement ?? EMPTY_ENGAGEMENT).inWatchlist;

  const toggleWatchlist = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    if (!isSignedIn || setWatchlist.isPending) return;
    setWatchlist.mutate(!inWatchlist);
  };

  return (
    <Card
      variant="poster"
      component="button"
      type="button"
      onClick={onClick}
      aria-label={name}
      sx={{
        // Grows smoothly with the viewport instead of stepping, so a row of
        // cards never changes size all at once. 193 is the 1440-wide design.
        width: "clamp(150px, 13vw, 260px)",
        cursor: "pointer",
        display: "block",
        textAlign: "left",
        font: "inherit",
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
      }}
    >
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
            width: 32,
            height: 32,
            borderBottomLeftRadius: "8px",
            bgcolor: "#333333",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* A span rather than a button: the whole card is already one, and a
              button inside a button is invalid. */}
          <Box
            component="span"
            role="button"
            tabIndex={isSignedIn ? 0 : -1}
            aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            aria-pressed={inWatchlist}
            aria-disabled={!isSignedIn}
            onClick={toggleWatchlist}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") toggleWatchlist(event);
            }}
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 24,
              height: 24,
              // Same fill as the card frame, so the button reads as a notch
              // cut out of the poster rather than a chip floating on top of it.
              borderRadius: "8px",
              bgcolor: "#ffffff1a",
              cursor: isSignedIn ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FavoriteIcon sx={{ fontSize: "12px", color: inWatchlist ? "primary.main" : "#ffffff" }} />
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
