"use client";

import { type Title } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import { APP } from "@/shared/lib/routes";
import ArrowForward from "@mui/icons-material/ArrowForward";
import StarIcon from "@mui/icons-material/Star";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface MoreLikeThisTitle extends Title {
  rating?: number;
  genres?: string[];
}

interface TitleMoreLikeThisProps {
  items: MoreLikeThisTitle[];
}

/**
 * Distinct from the poster-overlay `TitleCard` used elsewhere (Catalog rows
 * on /discover) — this section's Figma card shows the image on top and the
 * title/genres/rating in plain text below it.
 */
export default function TitleMoreLikeThis({ items }: TitleMoreLikeThisProps) {
  const router = useRouter();

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
        {items.map((item) => (
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
            {!!item.genres?.length && (
              <Typography
                sx={{ fontSize: "13px", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {item.genres.join(" ,")}
              </Typography>
            )}
            {item.rating !== undefined && (
              <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <StarIcon sx={{ fontSize: "16px", color: "primary.main" }} />
                <Typography component="span" sx={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
                  {item.rating.toFixed(1)}
                </Typography>
                <Typography component="span" sx={{ fontSize: "12px", color: "text.secondary" }}>
                  /10
                </Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
