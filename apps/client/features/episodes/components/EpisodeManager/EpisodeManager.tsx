"use client";
import useEpisodeStreamUrl from "@/features/episodes/api/use-episode-stream-url";
import useEpisodes from "@/features/episodes/api/use-episodes";
import { Episode } from "@/features/episodes/schemas/episode";
import { VideoPreviewModal } from "@/features/player";
import AddIcon from "@mui/icons-material/Add";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useApiErrorMessage } from "@shared/api/use-api-error-message";
import { useEditingLanguage } from "@shared/lib/editing-language";
import { tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import { useTranslations } from "next-intl";
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
        <EpisodeList seasonId={seasonId} episodes={episodes} />
        <EpisodeModal />
        <DeleteModalWrapper />
        <VideoPreviewModalWrapper />
      </Box>
    </EpisodeManagerProvider>
  );
}

function DeleteModalWrapper() {
  const describeError = useApiErrorMessage();
  const t = useTranslations("episodes");
  const { isDeleteModalOpen, closeDeleteModal, episodeToDelete, handleConfirmDelete, deleteMutation } = useEpisodeManagerContext();

  return (
    <DeleteModal
      isOpen={isDeleteModalOpen}
      onClose={closeDeleteModal}
      title={episodeToDelete ? t("episodeTitle", { number: episodeToDelete.number, name: episodeToDelete.name }) : ""}
      onConfirm={handleConfirmDelete}
      isDeleting={deleteMutation.isPending}
      error={describeError(deleteMutation.error)}
    />
  );
}

function EpisodeManagerHeader() {
  const t = useTranslations("episodes");
  const { openCreate } = useEpisodeManagerContext();
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Typography component="h3" variant="h6" sx={{ color: tokens.text.primary, fontWeight: 700 }}>
        {t("manager.heading")}
      </Typography>
      <Button variant="outlined" size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={openCreate}>
        {t("manager.add")}
      </Button>
    </Box>
  );
}

function EpisodeList({ seasonId, episodes }: { seasonId: string; episodes: Episode[] }) {
  const t = useTranslations("episodes");
  const { translationLocale } = useEditingLanguage();
  const { data: localized } = useEpisodes(seasonId, { enabled: !!translationLocale, contentLocale: translationLocale ?? undefined });
  const untranslated = new Set(
    translationLocale ? (localized ?? []).filter((episode) => episode.content.fallback).map((episode) => episode.id) : [],
  );
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
        <InboxOutlinedIcon sx={{ fontSize: 28, color: tokens.border.faint }} />
        <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>{t("manager.empty")}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {episodes.map((episode) => (
        <EpisodeItem key={episode.id} episode={episode} isUntranslated={untranslated.has(episode.id)} />
      ))}
    </Box>
  );
}

function VideoPreviewModalWrapper() {
  const t = useTranslations("episodes");
  const { isPreviewModalOpen, closePreviewModal, previewEpisode } = useEpisodeManagerContext();
  const { data: previewStreamUrl, isLoading } = useEpisodeStreamUrl(previewEpisode?.id ?? "", {
    enabled: isPreviewModalOpen && Boolean(previewEpisode?.id),
  });

  return (
    <VideoPreviewModal
      isOpen={isPreviewModalOpen}
      onClose={closePreviewModal}
      streamUrl={previewStreamUrl}
      title={previewEpisode ? t("episodeTitle", { number: previewEpisode.number, name: previewEpisode.name }) : undefined}
      isLoading={isLoading}
    />
  );
}
