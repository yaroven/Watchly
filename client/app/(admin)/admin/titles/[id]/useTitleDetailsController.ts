"use client";

import useEpisodes from "@/features/episodes/api/use-episodes";
import useSeasons from "@/features/season/api/use-seasons";
import useTitle from "@/features/title/api/use-title";
import { useDeleteTitle, useTranscodeTitle } from "@/features/title/api/use-title-mutations";
import useTitleStreamUrl from "@/features/title/api/use-title-stream-url";
import { Season } from "@/features/season/schemas/season";
import { Title, TitleType } from "@/features/title/schemas/title";
import TranscodingStatus from "@/types/transcoding-status";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface UseTitleDetailsControllerProps {
  title: Title;
  initialSeasons: Season[];
}

export function useTitleDetailsController({
  title,
  initialSeasons,
}: UseTitleDetailsControllerProps) {
  const router = useRouter();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(() =>
    title.type === TitleType.SERIES ? initialSeasons[0]?.id : undefined,
  );
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: titleData } = useTitle(title.id, { initialData: title });
  const isSeries = titleData?.type === TitleType.SERIES;
  const currentTitle = titleData ?? title;

  const { data: seasons = initialSeasons } = useSeasons(title.id, {
    enabled: isSeries,
    initialData: initialSeasons,
  });

  const activeSeasonId = selectedSeasonId ?? (isSeries ? seasons[0]?.id : undefined);

  const { data: episodes = [] } = useEpisodes(activeSeasonId ?? "", {
    enabled: Boolean(activeSeasonId),
  });

  const currentTranscodingStatus = currentTitle.transcodingStatus;

  const { isPending: isTranscoding, mutateAsync: restartTranscoding } = useTranscodeTitle();
  const { isPending: isDeleting, mutateAsync: deleteTitle } = useDeleteTitle({
    onSuccess: () => {
      setIsDeleteModalOpen(false);
      router.push("/admin/titles");
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
    openDeleteModal: () => setIsDeleteModalOpen(true),
    closeDeleteModal: () => setIsDeleteModalOpen(false),
    isTranscoding,
    restartTranscoding,
    isDeleting,
    deleteTitle,
    streamUrl,
    isPreviewLoading: isPreviewModalOpen && !streamUrl,
  };
}
