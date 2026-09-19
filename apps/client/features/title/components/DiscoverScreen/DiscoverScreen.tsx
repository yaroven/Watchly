"use client";

import { APP } from "@/shared/lib/routes";
import { TranscodingStatus } from "@/types";
import useTitles from "@features/title/api/use-titles";
import Catalog from "@features/title/components/Catalog";
import SpotlightGrid from "@features/title/components/SpotlightGrid";
import { Box } from "@mui/material";
import HeroSlider from "@shared/ui/HeroSlider";
import HotNewsSection from "@shared/ui/HotNewsSection";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { heroSlides, news, spotlight } from "./mocks";

interface DiscoverScreenProps {
  /** Rendered above the hero — used by /discover for the title overview panel. */
  header?: ReactNode;
}

export default function DiscoverScreen({ header }: DiscoverScreenProps) {
  const router = useRouter();

  const { data } = useTitles({
    page: 1,
    limit: 12,
    transcodingStatus: TranscodingStatus.COMPLETED,
  });

  const items = data?.items || [];
  const viewAll = () => router.push(APP.MOVIES);

  return (
    <Box>
      {header}
      <Box sx={{ display: "flex", gap: "32px", mb: "40px" }}>
        <Box sx={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: "32px" }}>
          <HeroSlider titles={heroSlides} />
          <Catalog title="Recommended for you" items={items} onViewAll={viewAll} />
        </Box>
        <HotNewsSection news={news} />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "34px" }}>
        <Catalog title="Trending movies" bleed items={items} onViewAll={viewAll} />
        <Catalog title="Trending series" bleed items={items} onViewAll={viewAll} />
        <Catalog title="Genres" bleed items={items} onViewAll={viewAll} />
        <Box sx={{ mt: "62px", mb: "56px" }}>
          <SpotlightGrid {...spotlight} />
        </Box>
        <Catalog title="IMDB Top Movies" bleed items={items} onViewAll={viewAll} />
        <Catalog title="IMDB Top Series" bleed items={items} onViewAll={viewAll} />
        <Catalog title="Trending TV Shows" bleed items={items} onViewAll={viewAll} />
        <Catalog title="My Watchlist" bleed items={items} onViewAll={viewAll} />
      </Box>
    </Box>
  );
}
