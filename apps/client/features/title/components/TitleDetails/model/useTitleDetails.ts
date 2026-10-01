"use client";

import useEpisodes from "@/features/episodes/api/use-episodes";
import useSeasons from "@/features/season/api/use-seasons";
import { Season } from "@/features/season/schemas/season";
import useTitle from "@/features/title/api/use-title";
import { useDeleteTitle, useTranscodeTitle } from "@/features/title/api/use-title-mutations";
import useTitleStreamUrl from "@/features/title/api/use-title-stream-url";
import { Title, TitleType } from "@/features/title/schemas/title";
import { ADMIN } from "@/shared/lib/routes";
import TranscodingStatus from "@/types/transcoding-status";
import { useRouter } from "next/navigation";
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

  // `initialDataUpdatedAt: 0` marks the server-rendered payload as already stale.
  // It was fetched without a session, so its viewer-scoped engagement block is
  // empty; without this the fresh viewer-keyed cache entry would adopt it as
  // current and skip the refetch for the whole staleTime.
  const { data: titleData } = useTitle(title.id, { initialData: title, initialDataUpdatedAt: 0 });
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
