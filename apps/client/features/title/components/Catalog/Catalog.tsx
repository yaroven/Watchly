"use client";

import { Title, TitleType } from "@/features/title/schemas/title";
import { APP } from "@/shared/lib/routes";
import TitleCard from "@features/title/components/TitleCard";
import { ArrowForward as ArrowForwardIcon } from "@mui/icons-material";
import { Box } from "@mui/material";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";

interface CatalogProps {
  title: string;
  items: Title[];
  onViewAll?: () => void;
  viewAllLabel?: string;
}

export default function Catalog({ items, title, onViewAll, viewAllLabel = "View All" }: CatalogProps) {
  const router = useRouter();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        {title && (
          <Typography component="span" sx={{ fontSize: 24, fontWeight: 700, color: "#ffffff" }}>
            {title}
          </Typography>
        )}

        {onViewAll && (
          <Box
            component="button"
            type="button"
            onClick={onViewAll}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              px: 0,
              border: "none",
              background: "none",
              font: "inherit",
              fontSize: "16px",
              color: "#ffffff",
              cursor: "pointer",
              transition: "color .15s ease-out",
              ":hover": { color: "primary.main" },
              // Nudging the arrow on hover echoes the slider controls.
              ":hover .catalog-view-all-arrow": { transform: "translateX(3px)" },
              "@media (prefers-reduced-motion: reduce)": {
                transition: "none",
                ":hover .catalog-view-all-arrow": { transform: "none" },
              },
            }}
          >
            {viewAllLabel}
            <ArrowForwardIcon
              className="catalog-view-all-arrow"
              sx={{ fontSize: "20px", color: "primary.main", transition: "transform .15s ease-out" }}
            />
          </Box>
        )}
      </Box>
      <Box
        sx={{
          display: "flex",
          gap: "16px",
          overflowX: "auto",
          // Cards keep their width instead of squeezing to fit the row.
          "& > *": { flexShrink: 0 },
          // Room for the scrollbar so it never covers the cards.
          pb: "8px",
          scrollSnapType: "x proximity",
          "& > * ": { scrollSnapAlign: "start" },
          scrollbarWidth: "thin",
          scrollbarColor: "#333333 transparent",
          "&::-webkit-scrollbar": { height: "6px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": { background: "#333333", borderRadius: "3px" },
          "&::-webkit-scrollbar-thumb:hover": { background: "#4a4a4a" },
        }}
      >
        {items.map((item) => (
          <TitleCard
            key={item.id}
            onClick={() => router.push(item.type === TitleType.SERIES ? APP.SERIES(item.id) : APP.MOVIE(item.id))}
            {...item}
          ></TitleCard>
        ))}
      </Box>
    </Box>
  );
}
