import { EpisodeListSkeleton } from "@/features/episodes/components/EpisodeList";
import { VideoPlayerSkeleton } from "@/features/player/components/CustomVideoPlayer";
import { SeasonTabsSkeleton } from "@/features/season/components/SeasonTabs";
import { TitleInfoSkeleton } from "@/features/title/components/TitleInfo";
import styles from "./page.module.scss";

export default function Loading() {
  return (
    <div className={styles.container}>
      <TitleInfoSkeleton />
      <VideoPlayerSkeleton />
      <EpisodeListSkeleton />
      <SeasonTabsSkeleton />
    </div>
  );
}
