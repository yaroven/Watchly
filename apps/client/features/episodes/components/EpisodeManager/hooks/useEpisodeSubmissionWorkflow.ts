"use client";

import { useCreateEpisodeWithUpload, useUpdateEpisode } from "@/features/episodes/api/use-episode-mutations";
import { CreateEpisodeDto, CreateEpisodeFormValues, Episode, UpdateEpisodeFormValues } from "@/features/episodes/schemas/episode";
import { useState } from "react";

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
  const [uploadProgress, setUploadProgress] = useState(0);

  const createMutation = useCreateEpisodeWithUpload({
    onUploadProgress: setUploadProgress,
    onError: () => {
      setUploadProgress(0);
    },
    onSuccess: () => {
      setUploadProgress(0);
      onCreateSuccess?.();
    },
  });
  const updateMutation = useUpdateEpisode({
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
    uploadProgress,
    setUploadProgress,
    isUploading: uploadProgress > 0 && uploadProgress < 100,
    createMutation,
    updateMutation,
  };
}
