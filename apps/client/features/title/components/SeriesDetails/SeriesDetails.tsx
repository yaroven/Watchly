import type { Episode } from "@features/episodes/schemas/episode";
import type { Season } from "@features/season/schemas/season";
import TitleInformation from "@features/title/components/TitleInformation";
import TitleMoreLikeThis from "@features/title/components/TitleMoreLikeThis";
import TitleOverview from "@features/title/components/TitleOverview";
import { moreLikeThis } from "@features/title/components/TitleOverview/mocks";
import TitleReviews from "@features/title/components/TitleReviews";
import TitleTabs from "@features/title/components/TitleTabs";
import type { Title } from "@features/title/schemas/title";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import SeriesEpisodeBrowser from "./components/SeriesEpisodeBrowser";

interface SeriesDetailsProps {
  title: Title;
  seasons: Season[];
  episodes: Episode[];
  currentSeasonId: string;
}

const SECTIONS = [
  { id: "information", label: "Information" },
  { id: "episodes", label: "Episodes" },
  { id: "more-like-this", label: "More Like This" },
  { id: "reviews", label: "Reviews" },
];

export default function SeriesDetails({ title, seasons, episodes, currentSeasonId }: SeriesDetailsProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "48px", pb: "64px" }}>
      <TitleOverview title={title} />
      <TitleTabs sections={SECTIONS} />

      <Box id="information">
        <TitleInformation title={title} />
      </Box>

      <Box id="episodes" sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {seasons.length ? (
          <SeriesEpisodeBrowser titleId={title.id} seasons={seasons} episodes={episodes} currentSeasonId={currentSeasonId} />
        ) : (
          <Typography sx={{ color: "text.secondary" }}>No seasons found for this series.</Typography>
        )}
      </Box>

      <Box id="more-like-this">
        <TitleMoreLikeThis items={moreLikeThis} />
      </Box>

      <Box id="reviews">
        <TitleReviews title={title} />
      </Box>
    </Box>
  );
}
