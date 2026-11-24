"use client";

import { useWatchlist } from "@/features/title-engagement";
import { ExternalRatingSource, Title, TitleType } from "@/features/title/schemas/title";
import { useRouter } from "@/i18n/navigation";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import { APP } from "@/shared/lib/routes";
import { TranscodingStatus } from "@/types";
import useTitles from "@features/title/api/use-titles";
import Catalog from "@features/title/components/Catalog";
import type { SpotlightTitle } from "@features/title/components/SpotlightGrid";
import SpotlightGrid from "@features/title/components/SpotlightGrid";
import { Box } from "@mui/material";
import Typography from "@mui/material/Typography";
import HeroSlider, { type SliderTitle } from "@shared/ui/HeroSlider";
import HotNewsSection from "@shared/ui/HotNewsSection";
import { useTranslations } from "next-intl";
import TitleRow from "./components/TitleRow";
import { news } from "./mocks";

const HERO_SLOTS = 3;
const SPOTLIGHT_SLOTS = 3;
const ROW_SIZE = 12;

function imdbRatingOf(title: Title): number | undefined {
  return title.externalRatings.find((rating) => rating.source === ExternalRatingSource.IMDB)?.rating;
}

function toSliderTitle(title: Title, noScore: string): SliderTitle {
  const rating = imdbRatingOf(title);
  return {
    id: title.id,
    title: title.name,
    description: title.description,
    score: rating !== undefined ? rating.toFixed(1) : noScore,
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
  const t = useTranslations("title.discover");
  const router = useRouter();

  const { data } = useTitles({
    page: 1,
    limit: ROW_SIZE,
    transcodingStatus: TranscodingStatus.COMPLETED,
  });

  const { data: watchlist, isError: watchlistFailed } = useWatchlist({ page: 1, limit: ROW_SIZE });
  const watchlistItems = watchlist?.items ?? [];

  const items = data?.items || [];
  const viewAllTitles = () => router.push(APP.SEARCH());

  const heroTitles = items.slice(0, HERO_SLOTS).map((title) => toSliderTitle(title, t("noScore")));
  const spotlightItems = items.slice(HERO_SLOTS, HERO_SLOTS + SPOTLIGHT_SLOTS);

  return (
    <Box>
      <Box sx={{ display: "flex", gap: "32px", mb: "40px" }}>
        <Box sx={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: "32px" }}>
          {!!heroTitles.length && <HeroSlider titles={heroTitles} />}
          <Catalog title={t("recommended")} items={items} onViewAll={viewAllTitles} />
        </Box>
        <HotNewsSection news={news} />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "34px" }}>
        <TitleRow heading={t("movies")} type={TitleType.MOVIE} />
        <TitleRow heading={t("series")} type={TitleType.SERIES} />
        {spotlightItems.length === SPOTLIGHT_SLOTS && (
          <Box sx={{ mt: "62px", mb: "56px" }}>
            <SpotlightGrid
              feature={toSpotlightTitle(spotlightItems[0])}
              secondary={toSpotlightTitle(spotlightItems[1])}
              tall={toSpotlightTitle(spotlightItems[2])}
            />
          </Box>
        )}
        {watchlistFailed ? (
          <Box>
            <Typography variant="h3" sx={{ mb: "12px" }}>
              {t("myWatchlist")}
            </Typography>
            <Typography sx={{ color: "text.secondary" }}>{t("watchlistError")}</Typography>
          </Box>
        ) : (
          watchlistItems.length > 0 && (
            <Catalog title={t("myWatchlist")} bleed items={watchlistItems} onViewAll={() => router.push(APP.WATCHLIST)} />
          )
        )}
      </Box>
    </Box>
  );
}
