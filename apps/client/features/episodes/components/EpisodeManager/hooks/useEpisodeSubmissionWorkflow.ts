"use client";

import { useCreateEpisodeWithUpload, useUpdateEpisode } from "@/features/episodes/api/use-episode-mutations";
import { CreateEpisodeDto, CreateEpisodeFormValues, Episode, UpdateEpisodeFormValues } from "@/features/episodes/schemas/episode";
import { INLINE_ERROR } from "@shared/api/write-errors";

interface UseEpisodeSubmissionWorkflowProps {
  seasonId: string;
  editingEpisode: Episode | null;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
}

export function useEpisodeSubmissionWorkflow({
  seasonId,
  editingEpisode,
  onCreateSuccess,
  onUpdateSuccess,
}: UseEpisodeSubmissionWorkflowProps) {
  const createMutation = useCreateEpisodeWithUpload({
    meta: INLINE_ERROR,
    onSuccess: () => {
      onCreateSuccess?.();
    },
  });
  const updateMutation = useUpdateEpisode({
    meta: INLINE_ERROR,
    onSuccess: () => {
      onUpdateSuccess?.();
    },
  });

  const submit = (data: CreateEpisodeFormValues) => {
    if (editingEpisode) {
      const payload: UpdateEpisodeFormValues = {
        number: data.number,
        name: data.name,
        description: data.description,
      };

      return updateMutation.mutate({ id: editingEpisode.id, payload });
    }

    if (!data.videoFile) {
      return;
    }

    const payload: CreateEpisodeDto = {
      number: data.number,
      name: data.name,
      description: data.description,
      seasonId,
      videoFile: data.videoFile,
    };

    return createMutation.mutate(payload);
  };

  return {
    submit,
    uploadProgress: createMutation.uploadProgress,
    isUploading: createMutation.isUploading,
    createMutation,
    updateMutation,
  };
}
