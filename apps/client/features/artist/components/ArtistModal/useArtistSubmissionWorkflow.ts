"use client";

import { useCreateArtistWithUpload, useUpdateArtistWithUpload } from "@/features/artist/api/use-artist-mutations";
import { Artist, ArtistFormValues } from "@/features/artist/schemas/artist";
import { ApiError } from "@/shared/api/api-error";
import { useState } from "react";

interface UseArtistSubmissionWorkflowProps {
  initialData?: Artist;
}

export function useArtistSubmissionWorkflow({ initialData }: UseArtistSubmissionWorkflowProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [actionError, setActionError] = useState<Error | null>(null);

  const { mutateAsync: createArtist, isPending: isCreating } = useCreateArtistWithUpload({
    onUploadProgress: setUploadProgress,
  });
  const { mutateAsync: updateArtist, isPending: isUpdating } = useUpdateArtistWithUpload({
    onUploadProgress: setUploadProgress,
  });

  const submit = async (data: ArtistFormValues) => {
    setActionError(null);
    setUploadProgress(0);

    try {
      if (initialData) {
        await updateArtist({ id: initialData.id, payload: data });
      } else {
        await createArtist(data);
      }
      setUploadProgress(0);
    } catch (error: unknown) {
      const normalizedError = error instanceof Error ? error : new ApiError("Failed to save actor");
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
  };
}
