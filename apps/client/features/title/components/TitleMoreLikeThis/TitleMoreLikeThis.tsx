"use client";

import useTitles from "@/features/title/api/use-titles";
import { ExternalRatingSource, type Title } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import { APP } from "@/shared/lib/routes";
import ArrowForward from "@mui/icons-material/ArrowForward";
import StarIcon from "@mui/icons-material/Star";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useRouter } from "next/navigation";

const RESULT_LIMIT = 6;

interface TitleMoreLikeThisProps {
  title: Title;
}

/**
 * Distinct from the poster-overlay `TitleCard` used elsewhere (Catalog rows
 * on /discover) — this section's Figma card shows the image on top and the
 * title/genres/rating in plain text below it.
 *
 * "Similar" has no dedicated backend concept — this browses other titles
 * sharing the current title's first genre (the only many-to-many filter the
 * list endpoint supports) and falls back to a plain recent-titles list when
 * this title has no genres yet.
 */
export default function TitleMoreLikeThis({ title }: TitleMoreLikeThisProps) {
  const router = useRouter();
  const { data } = useTitles({ genreId: title.genres[0]?.id, limit: RESULT_LIMIT + 1 });
  const items = (data?.items ?? []).filter((item) => item.id !== title.id).slice(0, RESULT_LIMIT);

  if (!items.length) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <Typography variant="h3">More Like This</Typography>
        <Box
          component="button"
          type="button"
          onClick={() => router.push(APP.SEARCH())}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "none",
            background: "none",
            font: "inherit",
            fontSize: "16px",
            color: "#ffffff",
            cursor: "pointer",
            ":hover": { color: "primary.main" },
          }}
        >
          View All
          <ArrowForward sx={{ fontSize: "20px", color: "primary.main" }} />
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: "16px",
          overflowX: "auto",
          pb: "8px",
          "& > *": { flexShrink: 0 },
          scrollbarWidth: "thin",
          scrollbarColor: "#333333 transparent",
        }}
      >
        {items.map((item) => {
          const rating = item.externalRatings.find((r) => r.source === ExternalRatingSource.IMDB)?.rating;

          return (
            <Box
              key={item.id}
              component="button"
              type="button"
              onClick={() => router.push(APP.TITLE(item.id))}
              sx={{
                width: "clamp(180px, 15vw, 220px)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "16px",
                p: "10px",
                backgroundColor: "#191919",
                cursor: "pointer",
                textAlign: "left",
                font: "inherit",
                ":hover": { borderColor: "primary.main" },
              }}
            >
              <Box sx={{ position: "relative", width: "100%", aspectRatio: "1 / 1", borderRadius: "10px", overflow: "hidden" }}>
                <Image src={getOptimizedImageSrc(item.posterUrl)} alt="" fill sizes="220px" style={{ objectFit: "cover" }} />
              </Box>
              <Typography
                sx={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#ffffff",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.name}
              </Typography>
              {!!item.genres.length && (
                <Typography
                  sx={{ fontSize: "13px", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {item.genres.map((genre) => genre.name).join(", ")}
                </Typography>
              )}
              {rating !== undefined && (
                <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <StarIcon sx={{ fontSize: "16px", color: "primary.main" }} />
                  <Typography component="span" sx={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
                    {rating.toFixed(1)}
                  </Typography>
                  <Typography component="span" sx={{ fontSize: "12px", color: "text.secondary" }}>
                    /10
                  </Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
