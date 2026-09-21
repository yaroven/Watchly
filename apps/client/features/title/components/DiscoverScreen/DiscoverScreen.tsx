"use client";

import { TitleType } from "@/features/title/schemas/title";
import { APP } from "@/shared/lib/routes";
import { TranscodingStatus } from "@/types";
import useTitles from "@features/title/api/use-titles";
import Catalog from "@features/title/components/Catalog";
import SpotlightGrid from "@features/title/components/SpotlightGrid";
import { Box } from "@mui/material";
import HeroSlider from "@shared/ui/HeroSlider";
import HotNewsSection from "@shared/ui/HotNewsSection";
import { useRouter } from "next/navigation";
import { heroSlides, news, spotlight } from "./mocks";

export default function DiscoverScreen() {
  const router = useRouter();

  const { data } = useTitles({
    page: 1,
    limit: 12,
    transcodingStatus: TranscodingStatus.COMPLETED,
  });

  const items = data?.items || [];
  // Each row browses the closest real filter we have (`Title.type`) — there's
  // no backend concept yet of "trending"/"genre"/"IMDB rank"/"watchlist" to
  // filter by, so rows that aren't movie- or series-specific just browse
  // everything (see PLACEHOLDER_DATA_BACKEND_TODO.md).
  const viewAllMovies = () => router.push(APP.SEARCH({ type: TitleType.MOVIE }));
  const viewAllSeries = () => router.push(APP.SEARCH({ type: TitleType.SERIES }));
  const viewAllTitles = () => router.push(APP.SEARCH());

  return (
    <Box>
      <Box sx={{ display: "flex", gap: "32px", mb: "40px" }}>
        <Box sx={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: "32px" }}>
          <HeroSlider titles={heroSlides} />
          <Catalog title="Recommended for you" items={items} onViewAll={viewAllTitles} />
        </Box>
        <HotNewsSection news={news} />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "34px" }}>
        <Catalog title="Trending movies" bleed items={items} onViewAll={viewAllMovies} />
        <Catalog title="Trending series" bleed items={items} onViewAll={viewAllSeries} />
        <Catalog title="Genres" bleed items={items} onViewAll={viewAllTitles} />
        <Box sx={{ mt: "62px", mb: "56px" }}>
          <SpotlightGrid {...spotlight} />
        </Box>
        <Catalog title="IMDB Top Movies" bleed items={items} onViewAll={viewAllMovies} />
        <Catalog title="IMDB Top Series" bleed items={items} onViewAll={viewAllSeries} />
        <Catalog title="Trending TV Shows" bleed items={items} onViewAll={viewAllSeries} />
        <Catalog title="My Watchlist" bleed items={items} onViewAll={() => router.push(APP.WATCHLIST)} />
      </Box>
    </Box>
  );
}
