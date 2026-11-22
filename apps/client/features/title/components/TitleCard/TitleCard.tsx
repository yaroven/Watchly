"use client";

import { useSetTitleWatchlist } from "@/features/title-engagement";
import { type CardTitle, ExternalRatingSource } from "@/features/title/schemas/title";
import { useRouter } from "@/i18n/navigation";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import { BookmarkBorder as BookmarkBorderIcon, Bookmark as BookmarkIcon, Star as StarIcon } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { useLoginPath } from "@shared/lib/use-login-path";
import { useViewer } from "@shared/lib/use-viewer";
import { viewerControl } from "@shared/lib/viewer-control";
import { tokens } from "@shared/mui/theme";
import { useTranslations } from "next-intl";
import Image from "next/image";

type TitleProps = Pick<CardTitle, "id" | "name" | "posterUrl" | "type" | "genres" | "externalRatings" | "engagement"> & {
  onClick: () => void;
};

export default function TitleCard({ id, name, posterUrl, type, genres, externalRatings, engagement, onClick }: TitleProps) {
  const t = useTranslations("title");
  const posterSrc = getOptimizedImageSrc(posterUrl);
  const subtitle = genres.length ? genres.map((genre) => genre.name).join(", ") : t(`type.${type}`);
  const rating = externalRatings.find((r) => r.source === ExternalRatingSource.IMDB)?.rating;

  const router = useRouter();

  const signInPath = useLoginPath();
  const viewer = useViewer();
  const setWatchlist = useSetTitleWatchlist(id);
  const failed = setWatchlist.isError;

  const saved = engagement.viewer?.inWatchlist ?? null;
  const control = viewerControl({ viewer: viewer.status, known: saved !== null, busy: setWatchlist.isPending });

  const toggleWatchlist = (event: { stopPropagation: () => void; preventDefault: () => void }) => {
    event.stopPropagation();
    event.preventDefault();
    if (control.intent === "sign-in") router.push(signInPath());
    else if (control.intent === "write") setWatchlist.mutate(!saved);
  };

  const toggleLabel = failed
    ? t("card.watchlistFailed")
    : {
        pending: t("card.watchlistPending"),
        unknown: t("card.watchlistUnknown"),
        anonymous: t("card.signInToAdd"),
        ready: saved ? t("card.removeFromWatchlist") : t("card.addToWatchlist"),
      }[control.state];

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
            <StarIcon sx={{ fontSize: "16px", color: tokens.accent.primary }} />
            <Typography component="span" sx={{ fontSize: 12, fontWeight: 400, color: tokens.text.primary }}>
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
            bgcolor: tokens.surface.fill,
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
              bgcolor: `${tokens.text.primary}1a`,
              cursor: control.state === "pending" || control.state === "unknown" ? "default" : "pointer",
              opacity: control.dimmed ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {saved ? (
              <BookmarkIcon sx={{ fontSize: "12px", color: failed ? "error.main" : "primary.main" }} />
            ) : (
              <BookmarkBorderIcon sx={{ fontSize: "12px", color: failed ? "error.main" : tokens.text.primary }} />
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
              color: tokens.text.primary,
              fontSize: 10,
              lineHeight: 1.3,
              textAlign: "center",
            }}
          >
            {t("card.saveFailed")}
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
              color: tokens.text.primary,
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
              color: tokens.text.field,
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
