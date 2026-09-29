"use client";

import { AgeRating, ExternalRatingSource, type Title, TitleType } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { IMDB, Metacritic, RottenTomatoes, WMovie } from "@shared/assets/icons";
import { APP } from "@shared/lib/routes";
import Button from "@shared/ui/Button";
import CustomIcon from "@shared/ui/CustomIcon";
import InvertedCornerBox from "@shared/ui/InvertedCornerBox";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface TitleOverviewProps {
  title: Title;
}

const AGE_RATING_LABELS: Record<AgeRating, string> = {
  [AgeRating.AGE_0]: "All Ages",
  [AgeRating.AGE_12]: "12+",
  [AgeRating.AGE_16]: "16+",
  [AgeRating.AGE_18]: "18+",
};

// `tmovie` is Watchly's own score, not an external source — it has no endpoint yet.
const SCORE_ROWS: { key: "imdb" | "rottenTomatoes" | "metacritic" | "tmovie"; icon: typeof IMDB; source: ExternalRatingSource | null }[] = [
  { key: "imdb", icon: IMDB, source: ExternalRatingSource.IMDB },
  { key: "rottenTomatoes", icon: RottenTomatoes, source: ExternalRatingSource.ROTTEN_TOMATOES },
  { key: "tmovie", icon: WMovie, source: null },
  { key: "metacritic", icon: Metacritic, source: ExternalRatingSource.METACRITIC },
];

export default function TitleOverview({ title }: TitleOverviewProps) {
  const router = useRouter();
  const ratingBySource = new Map(title.externalRatings.map((rating) => [rating.source, rating.rating]));
  const isSeries = title.type === TitleType.SERIES;
  const posterSrc = getOptimizedImageSrc(title.posterUrl);
  const handlePlay = () => router.push(APP.WATCH(title.id));
  const releaseYear =
    title.createdAt && !Number.isNaN(new Date(title.createdAt).getTime()) ? new Date(title.createdAt).getFullYear() : undefined;
  return (
    <Box sx={{ display: "flex", gap: "0px" }}>
      <InvertedCornerBox
        corners={["top left", "top right", "bottom left", "bottom right"]}
        omitBorderSide="right"
        sx={{
          borderRadius: "36px",
          border: "2px solid #666666",
          width: "clamp(260px, 28vw, 418px)",
          aspectRatio: "418 / 611",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Image src={posterSrc} alt={title.name} fill sizes="(max-width: 900px) 260px, 28vw" style={{ objectFit: "cover" }} priority />
      </InvertedCornerBox>

      <InvertedCornerBox
        corners={["top left", "top right", "bottom left", "bottom right"]}
        omitBorderSide="left"
        sx={{
          position: "relative",
          overflow: "hidden",
          paddingX: "32px",
          paddingY: "108px",
          borderRadius: "36px",
          border: "2px solid #666666",
          backgroundColor: "transparent",
          flex: 1,
          minWidth: 0,
        }}
      >
        <Box sx={{ position: "absolute", top: 0, bottom: 0, left: 0, borderLeft: "2px dashed #B2B2B2", zIndex: 2 }} />

        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: "32px" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <Typography component="h1" variant="h2" sx={{ color: "#ffffff" }}>
                {title.name}
              </Typography>
              {releaseYear && (
                <Typography component="span" sx={{ fontSize: "18px", color: "text.secondary" }}>
                  ({releaseYear}
                  {isSeries ? "-" : ""})
                </Typography>
              )}
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: "10px", color: "text.secondary", fontSize: "14px" }}>
              <Typography component="span" sx={{ fontSize: "inherit" }}>
                {isSeries ? "TV Series" : "Movie"}
              </Typography>
              <Box component="span" sx={{ width: "4px", height: "4px", borderRadius: "50%", bgcolor: "text.secondary" }} />
              <Typography component="span" sx={{ fontSize: "inherit" }}>
                {title.runtime}m
              </Typography>
              <Box component="span" sx={{ width: "4px", height: "4px", borderRadius: "50%", bgcolor: "text.secondary" }} />
              <Typography component="span" sx={{ fontSize: "inherit" }}>
                {AGE_RATING_LABELS[title.ageRating]}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: "0px", flex: "1" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {title.genres.map((genre) => (
                  <Chip key={genre.id} label={genre.name} sx={{ height: "32px" }} />
                ))}
              </Box>

              <Typography sx={{ color: "text.secondary", fontSize: "16px", lineHeight: 1.6, maxWidth: "560px" }}>
                {title.description || "Description will appear here once added."}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: "14px", flexShrink: 0 }}>
              {SCORE_ROWS.map(({ key, icon, source }) => {
                const isPercent = source === ExternalRatingSource.ROTTEN_TOMATOES || source === ExternalRatingSource.METACRITIC;
                const value = source ? ratingBySource.get(source) : 8.1;

                return (
                  <Box key={key} sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                    <Typography component="span" sx={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", whiteSpace: "nowrap" }}>
                      {value === undefined ? (
                        "-"
                      ) : (
                        <>
                          {isPercent ? Math.round(value) : value.toFixed(1)}
                          <Typography component="span" sx={{ fontSize: "11px", fontWeight: 400, color: "text.secondary" }}>
                            {isPercent ? "%" : "/10"}
                          </Typography>
                        </>
                      )}
                    </Typography>
                    <CustomIcon icon={icon} sx={{ fontSize: key === "imdb" ? "26px" : "22px", flexShrink: 0 }} />
                  </Box>
                );
              })}
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: "12px" }}>
            <Button variant="contained" onClick={handlePlay}>
              {isSeries ? "Play Last Episode" : "Play"}
            </Button>
            <Button variant="outlined" href={title.trailerUrl} target="_blank" rel="noopener noreferrer">
              Watch Trailer
            </Button>
          </Box>
        </Box>
      </InvertedCornerBox>
    </Box>
  );
}
