"use client";

import { useCreateTitleWithUpload, useUpdateTitle } from "@/features/title/api/use-title-mutations";
import { Title, TitleFormValues } from "@/features/title/schemas/title";
import { ApiError } from "@/shared/api/api-error";
import { useState } from "react";

interface UseTitleSubmissionWorkflowProps {
  initialData?: Title;
}

export function useTitleSubmissionWorkflow({ initialData }: UseTitleSubmissionWorkflowProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadParts, setUploadParts] = useState<{ completed: number; total: number } | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const [createdTitle, setCreatedTitle] = useState<Title | null>(null);

  const { mutateAsync: createTitle, isPending: isCreating } = useCreateTitleWithUpload({
    onUploadProgress: setUploadProgress,
    onUploadPartProgress: (completed, total) => setUploadParts({ completed, total }),
  });
  const { mutateAsync: updateTitle, isPending: isUpdating } = useUpdateTitle();

  const submit = async (data: TitleFormValues) => {
    setActionError(null);
    setUploadProgress(0);
    setUploadParts(null);

    try {
      if (initialData) {
        await updateTitle({ id: initialData.id, payload: data, currentPosterUrl: initialData.posterUrl });
        setUploadProgress(0);
        return { createdId: initialData.id };
      }

      const title = await createTitle(data);

      setCreatedTitle(title);
      setUploadProgress(100);
      return { createdId: title.id };
    } catch (error: unknown) {
      const normalizedError = error instanceof Error ? error : new ApiError("Failed to save title");
      setUploadProgress(0);
      setUploadParts(null);
      setActionError(normalizedError);
      throw normalizedError;
    }
  };

  const resetWorkflow = () => {
    setCreatedTitle(null);
    setUploadProgress(0);
    setUploadParts(null);
    setActionError(null);
  };

  return {
    submit,
    resetWorkflow,
    uploadProgress,
    uploadParts,
    isUploading: uploadProgress > 0 && uploadProgress < 100,
    isPending: isCreating || isUpdating,
    actionError,
    createdTitle,
    createdTitleId: createdTitle?.id ?? null,
  };
}
