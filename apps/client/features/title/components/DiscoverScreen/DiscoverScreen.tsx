"use client";

import { ExternalRatingSource, Title, TitleType } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import { APP } from "@/shared/lib/routes";
import { TranscodingStatus } from "@/types";
import useTitles from "@features/title/api/use-titles";
import Catalog from "@features/title/components/Catalog";
import type { SpotlightTitle } from "@features/title/components/SpotlightGrid";
import SpotlightGrid from "@features/title/components/SpotlightGrid";
import { Box } from "@mui/material";
import HeroSlider, { type SliderTitle } from "@shared/ui/HeroSlider";
import HotNewsSection from "@shared/ui/HotNewsSection";
import { useRouter } from "next/navigation";
import { news } from "./mocks";

const HERO_SLOTS = 3;
const SPOTLIGHT_SLOTS = 3;

function imdbRatingOf(title: Title): number | undefined {
  return title.externalRatings.find((rating) => rating.source === ExternalRatingSource.IMDB)?.rating;
}

function toSliderTitle(title: Title): SliderTitle {
  const rating = imdbRatingOf(title);
  return {
    id: title.id,
    title: title.name,
    description: title.description,
    score: rating !== undefined ? rating.toFixed(1) : "N/A",
    // Interpolated straight into a CSS `url(...)`, so this needs a plain
    // string — not `getOptimizedImageSrc`, which can return `StaticImageData`.
    backdropUrl: title.posterUrl,
    watchLink: APP.WATCH(title.id),
    trailerLink: title.trailerUrl,
    genres: title.genres.map((genre) => genre.name),
  };
}

function toSpotlightTitle(title: Title): SpotlightTitle {
  return {
    id: title.id,
    name: title.name,
    description: title.description,
    genres: title.genres.map((genre) => genre.name),
    imageUrl: getOptimizedImageSrc(title.posterUrl),
    watchLink: APP.TITLE(title.id),
  };
}

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

  const heroTitles = items.slice(0, HERO_SLOTS).map(toSliderTitle);
  const spotlightItems = items.slice(HERO_SLOTS, HERO_SLOTS + SPOTLIGHT_SLOTS);

  return (
    <Box>
      <Box sx={{ display: "flex", gap: "32px", mb: "40px" }}>
        <Box sx={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: "32px" }}>
          {!!heroTitles.length && <HeroSlider titles={heroTitles} />}
          <Catalog title="Recommended for you" items={items} onViewAll={viewAllTitles} />
        </Box>
        <HotNewsSection news={news} />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "34px" }}>
        <Catalog title="Trending movies" bleed items={items} onViewAll={viewAllMovies} />
        <Catalog title="Trending series" bleed items={items} onViewAll={viewAllSeries} />
        <Catalog title="Genres" bleed items={items} onViewAll={viewAllTitles} />
        {spotlightItems.length === SPOTLIGHT_SLOTS && (
          <Box sx={{ mt: "62px", mb: "56px" }}>
            <SpotlightGrid
              feature={toSpotlightTitle(spotlightItems[0])}
              secondary={toSpotlightTitle(spotlightItems[1])}
              tall={toSpotlightTitle(spotlightItems[2])}
            />
          </Box>
        )}
        <Catalog title="IMDB Top Movies" bleed items={items} onViewAll={viewAllMovies} />
        <Catalog title="IMDB Top Series" bleed items={items} onViewAll={viewAllSeries} />
        <Catalog title="Trending TV Shows" bleed items={items} onViewAll={viewAllSeries} />
        <Catalog title="My Watchlist" bleed items={items} onViewAll={() => router.push(APP.WATCHLIST)} />
      </Box>
    </Box>
  );
}
