import CustomVideoPlayer from "@features/player/components/CustomVideoPlayer";
import StreamFilmInfo from "@features/title/components/StreamFilmInfo";
import StreamPhotos from "@features/title/components/StreamPhotos";
import TitleReviews from "@features/title/components/TitleReviews";
import type { Title } from "@features/title/schemas/title";
import Box from "@mui/material/Box";

interface MovieStreamProps {
  title: Title;
  streamUrl: string;
}

export default function MovieStream({ title, streamUrl }: MovieStreamProps) {
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
        <CustomVideoPlayer src={streamUrl} />
      </Box>

      <StreamFilmInfo title={title} />
      <StreamPhotos title={title} />
      <TitleReviews title={title} />
    </Box>
  );
}
