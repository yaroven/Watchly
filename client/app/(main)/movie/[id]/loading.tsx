import { VideoPlayerSkeleton } from "@/app/components/shared/CustomVideoPlayer";
import { TitleInfoSkeleton } from "@/app/components/ui/TitleInfo";
import styles from "./page.module.scss";

export default function Loading() {
  return (
    <div className={styles.container}>
      <TitleInfoSkeleton />
      <VideoPlayerSkeleton />
    </div>
  );
}
