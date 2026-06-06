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
  const [actionError, setActionError] = useState<Error | null>(null);
  const [createdTitleId, setCreatedTitleId] = useState<string | null>(null);

  const { mutateAsync: createTitle, isPending: isCreating } = useCreateTitleWithUpload({
    onUploadProgress: setUploadProgress,
  });
  const { mutateAsync: updateTitle, isPending: isUpdating } = useUpdateTitle();

  const submit = async (data: TitleFormValues) => {
    setActionError(null);
    setUploadProgress(0);

    try {
      if (initialData) {
        await updateTitle({ id: initialData.id, payload: data });
        setUploadProgress(0);
        return { createdId: initialData.id };
      }

      const createdTitle = await createTitle(data);

      setCreatedTitleId(createdTitle.id);
      setUploadProgress(100);
      return { createdId: createdTitle.id };
    } catch (error: unknown) {
      const normalizedError =
        error instanceof Error ? error : new ApiError("Failed to save title");
      setUploadProgress(0);
      setActionError(normalizedError);
      throw normalizedError;
    }
  };

  return {
    submit,
    uploadProgress,
    isUploading: uploadProgress > 0 && uploadProgress < 100,
    isPending: isCreating || isUpdating,
    actionError,
    createdTitleId,
  };
}
