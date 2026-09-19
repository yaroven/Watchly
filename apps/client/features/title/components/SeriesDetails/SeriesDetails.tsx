import type { Episode } from "@features/episodes/schemas/episode";
import type { Season } from "@features/season/schemas/season";
import TitleInfo from "@features/title/components/TitleInfo";
import type { Title } from "@features/title/schemas/title";
import SeriesEpisodeBrowser from "./components/SeriesEpisodeBrowser";
import styles from "./SeriesDetails.module.scss";

interface SeriesDetailsProps {
  title: Title;
  seasons: Season[];
  episodes: Episode[];
  initialEpisodeUrl?: string;
  initialEpisodeId: string;
  currentSeasonId: string;
}

export default function SeriesDetails({
  title,
  seasons,
  episodes,
  initialEpisodeUrl,
  initialEpisodeId,
  currentSeasonId,
}: SeriesDetailsProps) {
  return (
    <div className={styles.container}>
      <TitleInfo title={title} />
      {seasons.length ? (
        <SeriesEpisodeBrowser
          seasons={seasons}
          episodes={episodes}
          initialEpisodeUrl={initialEpisodeUrl}
          initialEpisodeId={initialEpisodeId}
          currentSeasonId={currentSeasonId}
        />
      ) : (
        <div className={styles.noContent}>No seasons found for this series.</div>
      )}
    </div>
  );
}
