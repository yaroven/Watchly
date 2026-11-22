"use client";

import { useEpisodes } from "@/features/episodes";
import type { Season } from "@/features/season";
import { useSeasons } from "@/features/season";
import useTitle from "@/features/title/api/use-title";
import { useDeleteTitle, useTranscodeTitle } from "@/features/title/api/use-title-mutations";
import useTitleStreamUrl from "@/features/title/api/use-title-stream-url";
import { Title, TitleType } from "@/features/title/schemas/title";
import { transcodingPollInterval } from "@/features/transcoding";
import { useRouter } from "@/i18n/navigation";
import { ADMIN } from "@/shared/lib/routes";
import TranscodingStatus from "@/types/transcoding-status";
import { INLINE_ERROR } from "@shared/api/write-errors";
import { useState } from "react";

interface UseTitleDetailsControllerProps {
  title: Title;
  initialSeasons: Season[];
}

export function useTitleDetails({ title, initialSeasons }: UseTitleDetailsControllerProps) {
  const router = useRouter();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(() =>
    title.type === TitleType.SERIES ? initialSeasons[0]?.id : undefined,
  );
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: titleData } = useTitle(title.id, {
    initialData: title,
    initialDataUpdatedAt: 0,
    refetchInterval: (query) =>
      query.state.data?.type === TitleType.MOVIE ? transcodingPollInterval([query.state.data.transcodingStatus]) : false,
  });
  const isSeries = titleData?.type === TitleType.SERIES;
  const currentTitle = titleData ?? title;

  const { data: seasons = initialSeasons } = useSeasons(title.id, { enabled: isSeries, initialData: initialSeasons });

  const activeSeasonId = selectedSeasonId ?? (isSeries ? seasons[0]?.id : undefined);

  const { data: episodes = [] } = useEpisodes(activeSeasonId ?? "", {
    enabled: Boolean(activeSeasonId),
    refetchInterval: (query) => transcodingPollInterval((query.state.data ?? []).map((episode) => episode.transcodingStatus)),
  });

  const currentTranscodingStatus = currentTitle.transcodingStatus;

  const {
    isPending: isTranscoding,
    mutate: restartTranscoding,
    error: transcodeError,
    reset: resetTranscode,
  } = useTranscodeTitle({ meta: INLINE_ERROR });
  const {
    isPending: isDeleting,
    mutate: deleteTitle,
    error: deleteError,
    reset: resetDelete,
  } = useDeleteTitle({
    meta: INLINE_ERROR,
    onSuccess: () => {
      setIsDeleteModalOpen(false);
      router.push(ADMIN.TITLES);
    },
  });

  const { data: streamUrl } = useTitleStreamUrl(title.id, {
    enabled: isPreviewModalOpen && currentTranscodingStatus === TranscodingStatus.COMPLETED,
  });

  return {
    title: currentTitle,
    isSeries,
    seasons,
    episodes,
    selectedSeasonId: activeSeasonId,
    setSelectedSeasonId,
    currentTranscodingStatus,
    isPreviewModalOpen,
    openPreviewModal: () => setIsPreviewModalOpen(true),
    closePreviewModal: () => setIsPreviewModalOpen(false),
    isDeleteModalOpen,
    openDeleteModal: () => {
      resetDelete();
      setIsDeleteModalOpen(true);
    },
    closeDeleteModal: () => setIsDeleteModalOpen(false),
    isTranscoding,
    restartTranscoding,
    transcodeError,
    resetTranscode,
    isDeleting,
    deleteTitle,
    deleteError,
    streamUrl,
    isPreviewLoading: isPreviewModalOpen && !streamUrl,
  };
}
