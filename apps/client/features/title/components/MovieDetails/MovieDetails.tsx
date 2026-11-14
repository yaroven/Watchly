import TitleInformation from "@features/title/components/TitleInformation";
import TitleMoreLikeThis from "@features/title/components/TitleMoreLikeThis";
import TitleOverview from "@features/title/components/TitleOverview";
import TitleReviews from "@features/title/components/TitleReviews";
import TitleTabs from "@features/title/components/TitleTabs";
import type { Title } from "@features/title/schemas/title";
import Box from "@mui/material/Box";
import { useTranslations } from "next-intl";

interface MovieDetailsProps {
  title: Title;
}

export default function MovieDetails({ title }: MovieDetailsProps) {
  const t = useTranslations("title.sections");
  const sections = [
    { id: "information", label: t("information") },
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

      <Box id="more-like-this">
        <TitleMoreLikeThis title={title} />
      </Box>

      <Box id="reviews">
        <TitleReviews title={title} />
      </Box>
    </Box>
  );
}
