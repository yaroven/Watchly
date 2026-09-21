import TitleInformation from "@features/title/components/TitleInformation";
import TitleMoreLikeThis from "@features/title/components/TitleMoreLikeThis";
import TitleOverview from "@features/title/components/TitleOverview";
import { moreLikeThis } from "@features/title/components/TitleOverview/mocks";
import TitleReviews from "@features/title/components/TitleReviews";
import TitleTabs from "@features/title/components/TitleTabs";
import type { Title } from "@features/title/schemas/title";
import Box from "@mui/material/Box";

interface MovieDetailsProps {
  title: Title;
}

const SECTIONS = [
  { id: "information", label: "Information" },
  { id: "more-like-this", label: "More Like This" },
  { id: "reviews", label: "Reviews" },
];

export default function MovieDetails({ title }: MovieDetailsProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "48px", pb: "64px" }}>
      <TitleOverview title={title} />
      <TitleTabs sections={SECTIONS} />

      <Box id="information">
        <TitleInformation title={title} />
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
