"use client";

import EpisodeManager from "@/features/episodes/components/EpisodeManager";
import VideoPreviewModal from "@/features/player/components/VideoPreviewModal";
import SeasonManager from "@/features/season/components/SeasonManager";
import { Season } from "@/features/season/schemas/season";
import { useSyncTitleRatings } from "@/features/title/api/use-title-mutations";
import TitleCastManager from "@/features/title/components/TitleCastManager";
import TitleForm from "@/features/title/components/TitleForm";
import { Title, TitleType } from "@/features/title/schemas/title";
import TranscodingStatus from "@/types/transcoding-status";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ReplayIcon from "@mui/icons-material/Replay";
import SyncIcon from "@mui/icons-material/Sync";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { keyframes } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
import GradientCard from "@shared/ui/GradientCard";
import { type ReactNode, useState } from "react";
import DeleteModal from "./components/DeleteModal";
import { useTitleDetails } from "./model/useTitleDetails";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

interface TitleDetailsProps {
  title: Title;
  initialSeasons: Season[];
}

export default function TitleDetails({ title, initialSeasons }: TitleDetailsProps) {
  const {
    title: currentTitle,
    isSeries,
    seasons,
    episodes,
    selectedSeasonId,
    setSelectedSeasonId,
    currentTranscodingStatus,
    isPreviewModalOpen,
    openPreviewModal,
    closePreviewModal,
    isDeleteModalOpen,
    openDeleteModal,
    closeDeleteModal,
    isTranscoding,
    restartTranscoding,
    isDeleting,
    deleteTitle,
    streamUrl,
    isPreviewLoading,
  } = useTitleDetails({
    title,
    initialSeasons,
  });

  const [ratingsSyncMessage, setRatingsSyncMessage] = useState<string | null>(null);
  const { mutate: syncRatings, isPending: isSyncingRatings } = useSyncTitleRatings({
    onSuccess: (ratings) =>
      setRatingsSyncMessage(ratings.length ? `Synced ${ratings.length} rating(s).` : "No ratings found for this title yet."),
    onError: (error) => setRatingsSyncMessage(error.message || "Failed to sync ratings."),
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "28px", padding: { xs: "24px 16px 40px", md: "40px 36px 56px" } }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          width: "100%",
          gap: "24px",
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Typography component="h1" variant="h2" sx={{ color: "#ffffff" }}>
            Manage Title
          </Typography>
          <Typography sx={{ mt: "14px", maxWidth: "680px", color: "text.secondary" }}>
            Update metadata, review the stream, and manage seasons or episodes from one screen.
          </Typography>
        </Box>

        <TitleDetailsActions
          title={currentTitle}
          currentTranscodingStatus={currentTranscodingStatus}
          isDeleting={isDeleting}
          isTranscoding={isTranscoding}
          isSyncingRatings={isSyncingRatings}
          onDelete={openDeleteModal}
          onPreview={openPreviewModal}
          onRestartTranscoding={() => restartTranscoding(title.id)}
          onSyncRatings={() => {
            setRatingsSyncMessage(null);
            syncRatings(title.id);
          }}
        />
      </Box>

      {ratingsSyncMessage && (
        <Alert severity="info" onClose={() => setRatingsSyncMessage(null)}>
          {ratingsSyncMessage}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.15fr) minmax(0, 1fr)" },
          gap: "24px",
          alignItems: "start",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <SectionCard title="Details" description="Edit the primary metadata for this title.">
            <TitleForm initialData={currentTitle} />
          </SectionCard>

          <SectionCard title="Cast" description="Assign actors and their characters, in display order.">
            <TitleCastManager titleId={title.id} />
          </SectionCard>
        </Box>

        {isSeries && (
          <SeriesManagementSection
            titleId={title.id}
            seasons={seasons}
            selectedSeasonId={selectedSeasonId}
            onSelectSeason={setSelectedSeasonId}
            episodes={episodes}
          />
        )}
      </Box>

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        titleName={currentTitle.name}
        isDeleting={isDeleting}
        onConfirm={async () => deleteTitle(title.id)}
      />

      <VideoPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={closePreviewModal}
        streamUrl={streamUrl}
        title={currentTitle.name}
        isLoading={isPreviewLoading}
      />
    </Box>
  );
}

function TitleDetailsActions({
  title,
  currentTranscodingStatus,
  isDeleting,
  isTranscoding,
  isSyncingRatings,
  onDelete,
  onPreview,
  onRestartTranscoding,
  onSyncRatings,
}: {
  title: Title;
  currentTranscodingStatus: TranscodingStatus;
  isDeleting: boolean;
  isTranscoding: boolean;
  isSyncingRatings: boolean;
  onDelete: () => void;
  onPreview: () => void;
  onRestartTranscoding: () => void;
  onSyncRatings: () => void;
}) {
  const hasSecondaryAction =
    (title.type === TitleType.MOVIE && currentTranscodingStatus === TranscodingStatus.FAILED) ||
    (title.type === TitleType.MOVIE && currentTranscodingStatus === TranscodingStatus.COMPLETED);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
      {title.type === TitleType.MOVIE && currentTranscodingStatus === TranscodingStatus.FAILED && (
        <Button variant="outlined" onClick={onRestartTranscoding} disabled={isTranscoding} startIcon={<ReplayIcon sx={{ fontSize: 16 }} />}>
          {isTranscoding ? "Restarting..." : "Restart Transcoding"}
        </Button>
      )}

      {title.type === TitleType.MOVIE && currentTranscodingStatus === TranscodingStatus.COMPLETED && (
        <Button variant="outlined" onClick={onPreview} startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}>
          Preview
        </Button>
      )}

      <Button
        variant="outlined"
        onClick={onSyncRatings}
        disabled={isSyncingRatings}
        startIcon={<SyncIcon sx={{ fontSize: 16, animation: isSyncingRatings ? `${spin} 1s linear infinite` : "none" }} />}
      >
        {isSyncingRatings ? "Syncing Ratings..." : "Sync Ratings"}
      </Button>

      {hasSecondaryAction && <Divider orientation="vertical" flexItem sx={{ borderColor: "#333333", my: "4px" }} />}

      <Button variant="contained" danger onClick={onDelete} disabled={isDeleting}>
        Delete Title
      </Button>
    </Box>
  );
}

function SeriesManagementSection({
  titleId,
  seasons,
  selectedSeasonId,
  onSelectSeason,
  episodes,
}: {
  titleId: string;
  seasons: Season[];
  selectedSeasonId?: string;
  onSelectSeason: (seasonId: string) => void;
  episodes: ReturnType<typeof useTitleDetails>["episodes"];
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <SectionCard title="Seasons" description="Organize the structure of your series before managing episodes.">
        <SeasonManager seasons={seasons} titleId={titleId} selectedSeasonId={selectedSeasonId} onSelectSeason={onSelectSeason} />
      </SectionCard>

      {selectedSeasonId && (
        <SectionCard title="Episodes" description="Manage the episode list and uploads for the selected season.">
          <EpisodeManager seasonId={selectedSeasonId} episodes={episodes} />
        </SectionCard>
      )}
    </Box>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <GradientCard sx={{ width: "100%" }}>
      <Box sx={{ px: "28px", pt: "24px" }}>
        <Typography component="h2" variant="h4" sx={{ color: "#ffffff" }}>
          {title}
        </Typography>
        <Typography sx={{ mt: "8px", color: "text.secondary" }}>{description}</Typography>
      </Box>

      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", mt: "20px" }} />

      <Box sx={{ p: "28px", display: "flex", flexDirection: "column", gap: "16px" }}>{children}</Box>
    </GradientCard>
  );
}
