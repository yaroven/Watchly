import { VideoPlayerSkeleton } from "@/features/player/components/CustomVideoPlayer";
import { TitleInfoSkeleton } from "@/features/title/components/TitleInfo";
import styles from "./page.module.scss";

export default function Loading() {
  return (
    <div className={styles.container}>
      <TitleInfoSkeleton />
      <VideoPlayerSkeleton />
    </div>
  );
}
