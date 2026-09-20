"use client";
import useEpisodeStreamUrl from "@/features/episodes/api/use-episode-stream-url";
import { Episode } from "@/features/episodes/schemas/episode";
import VideoPreviewModal from "@/features/player/components/VideoPreviewModal";
import AddIcon from "@mui/icons-material/Add";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
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
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
        <EpisodeManagerHeader />
        <EpisodeList episodes={episodes} />
        <EpisodeModal />
        <DeleteModalWrapper />
        <VideoPreviewModalWrapper />
      </Box>
    </EpisodeManagerProvider>
  );
}

function DeleteModalWrapper() {
  const { isDeleteModalOpen, closeDeleteModal, episodeToDelete, handleConfirmDelete, deleteMutation } = useEpisodeManagerContext();

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
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Typography component="h3" variant="h6" sx={{ color: "#ffffff", fontWeight: 700 }}>
        Episodes
      </Typography>
      <Button variant="outlined" size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={openCreate}>
        Add Episode
      </Button>
    </Box>
  );
}

function EpisodeList({ episodes }: { episodes: Episode[] }) {
  if (episodes.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          py: "36px",
          color: "text.secondary",
        }}
      >
        <InboxOutlinedIcon sx={{ fontSize: 28, color: "#444444" }} />
        <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>No episodes yet. Add the first one to get started.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
      {episodes.map((episode) => (
        <EpisodeItem key={episode.id} episode={episode} />
      ))}
    </Box>
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
      title={previewEpisode ? `Episode ${previewEpisode.number}: ${previewEpisode.name}` : undefined}
      isLoading={isLoading}
    />
  );
}
