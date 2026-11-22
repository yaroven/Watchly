import { CustomVideoPlayer } from "@features/player";
import StreamFilmInfo from "@features/title/components/StreamFilmInfo";
import StreamPhotos from "@features/title/components/StreamPhotos";
import TitleReviews from "@features/title/components/TitleReviews";
import type { Title } from "@features/title/schemas/title";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

interface MovieStreamProps {
  title: Title;
  streamUrl: string;
}

export default function MovieStream({ title, streamUrl }: MovieStreamProps) {
  const t = useTranslations("title");
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "40px", pb: "64px" }}>
      <Box
        sx={{
          borderRadius: "20px",
          border: "1px solid",
          borderColor: "primary.main",
          overflow: "hidden",
        }}
      >
        {streamUrl ? (
          <CustomVideoPlayer src={streamUrl} />
        ) : (
          <Typography sx={{ color: "text.secondary", p: "24px" }}>{t("movieStreamUnavailable")}</Typography>
        )}
      </Box>

      <StreamFilmInfo title={title} />
      <StreamPhotos title={title} />
      <TitleReviews title={title} />
    </Box>
  );
}
