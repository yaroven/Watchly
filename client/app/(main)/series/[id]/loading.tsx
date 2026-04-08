import { VideoPlayerSkeleton } from "@/app/components/shared/CustomVideoPlayer";
import { EpisodeListSkeleton } from "@/app/components/ui/EpisodeList";
import { SeasonTabsSkeleton } from "@/app/components/ui/SeasonTabs";
import { TitleInfoSkeleton } from "@/app/components/ui/TitleInfo";
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
