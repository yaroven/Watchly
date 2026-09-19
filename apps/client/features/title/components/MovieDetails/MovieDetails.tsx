import CustomVideoPlayer from "@features/player/components/CustomVideoPlayer";
import TitleInfo from "@features/title/components/TitleInfo";
import type { Title } from "@features/title/schemas/title";
import styles from "./MovieDetails.module.scss";

interface MovieDetailsProps {
  title: Title;
  streamUrl: string;
}

export default function MovieDetails({ title, streamUrl }: MovieDetailsProps) {
  return (
    <div className={styles.container}>
      <TitleInfo title={title} />
      <div className={styles.playerShell}>
        <CustomVideoPlayer src={streamUrl} />
      </div>
    </div>
  );
}
