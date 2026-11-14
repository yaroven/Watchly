import type { Episode } from "@features/episodes/schemas/episode";
import type { Season } from "@features/season/schemas/season";
import TitleInformation from "@features/title/components/TitleInformation";
import TitleMoreLikeThis from "@features/title/components/TitleMoreLikeThis";
import TitleOverview from "@features/title/components/TitleOverview";
import TitleReviews from "@features/title/components/TitleReviews";
import TitleTabs from "@features/title/components/TitleTabs";
import type { Title } from "@features/title/schemas/title";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import SeriesEpisodeBrowser from "./components/SeriesEpisodeBrowser";

interface SeriesDetailsProps {
  title: Title;
  seasons: Season[];
  episodes: Episode[];
  currentSeasonId: string;
}

export default function SeriesDetails({ title, seasons, episodes, currentSeasonId }: SeriesDetailsProps) {
  const t = useTranslations("title.sections");
  const sections = [
    { id: "information", label: t("information") },
    { id: "episodes", label: t("episodes") },
    { id: "more-like-this", label: t("moreLikeThis") },
    { id: "reviews", label: t("reviews") },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "48px", pb: "64px" }}>
      <TitleOverview title={title} />
      <TitleTabs sections={sections} />

      <Box id="information">
        <TitleInformation title={title} />
      </Box>

      <Box id="episodes" sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {seasons.length ? (
          <SeriesEpisodeBrowser titleId={title.id} seasons={seasons} episodes={episodes} currentSeasonId={currentSeasonId} />
        ) : (
          <Typography sx={{ color: "text.secondary" }}>{t("noSeasons")}</Typography>
        )}
      </Box>

      <Box id="more-like-this">
        <TitleMoreLikeThis title={title} />
      </Box>

      <Box id="reviews">
        <TitleReviews title={title} />
      </Box>
    </Box>
  );
}
