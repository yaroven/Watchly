"use client";
import useEpisodeStreamUrl from "@/features/episodes/api/use-episode-stream-url";
import { Episode } from "@/features/episodes/schemas/episode";
import VideoPreviewModal from "@/features/player/components/VideoPreviewModal";
import { Plus } from "lucide-react";
import styles from "./EpisodeManager.module.scss";
import DeleteModal from "./components/DeleteModal";
import EpisodeItem from "./components/EpisodeItem";
import EpisodeModal from "./components/EpisodeModal";
import { EpisodeManagerProvider, useEpisodeManagerContext } from "./context/EpisodeManagerContext";

interface EpisodeManagerProps {
  seasonId: string;
  episodes: Episode[];
}

export default function EpisodeManager({ seasonId, episodes }: EpisodeManagerProps) {
  return (
    <EpisodeManagerProvider seasonId={seasonId} episodes={episodes}>
      <div className={styles.container}>
        <EpisodeManagerHeader />
        <EpisodeList episodes={episodes} />
        <EpisodeModal />
        <DeleteModalWrapper />
        <VideoPreviewModalWrapper />
      </div>
    </EpisodeManagerProvider>
  );
}

function DeleteModalWrapper() {
  const {
    isDeleteModalOpen,
    closeDeleteModal,
    episodeToDelete,
    handleConfirmDelete,
    deleteMutation,
  } = useEpisodeManagerContext();

  return (
    <DeleteModal
      isOpen={isDeleteModalOpen}
      onClose={closeDeleteModal}
      title={episodeToDelete ? `Episode ${episodeToDelete.number}: ${episodeToDelete.name}` : ""}
      onConfirm={handleConfirmDelete}
      isDeleting={deleteMutation.isPending}
    />
  );
}

function EpisodeManagerHeader() {
  const { openCreate } = useEpisodeManagerContext();
  return (
    <div className={styles.header}>
      <h3>Episodes</h3>
      <button onClick={openCreate} className={styles.addButton}>
        <Plus size={16} /> Add Episode
      </button>
    </div>
  );
}

function EpisodeList({ episodes }: { episodes: Episode[] }) {
  return (
    <div className={styles.list}>
      {episodes.map((episode) => (
        <EpisodeItem key={episode.id} episode={episode} />
      ))}
    </div>
  );
}

function VideoPreviewModalWrapper() {
  const { isPreviewModalOpen, closePreviewModal, previewEpisode } = useEpisodeManagerContext();
  const { data: previewStreamUrl, isLoading } = useEpisodeStreamUrl(previewEpisode?.id ?? "", {
    enabled: isPreviewModalOpen && Boolean(previewEpisode?.id),
  });

  return (
    <VideoPreviewModal
      isOpen={isPreviewModalOpen}
      onClose={closePreviewModal}
      streamUrl={previewStreamUrl}
      title={
        previewEpisode ? `Episode ${previewEpisode.number}: ${previewEpisode.name}` : undefined
      }
      isLoading={isLoading}
    />
  );
}
