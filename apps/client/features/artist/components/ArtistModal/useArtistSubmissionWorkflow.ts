"use client";

import { useCreateArtistWithUpload, useUpdateArtistWithUpload } from "@/features/artist/api/use-artist-mutations";
import { Artist, ArtistFormValues } from "@/features/artist/schemas/artist";
import { ApiError } from "@/shared/api/api-error";
import { INLINE_ERROR } from "@shared/api/write-errors";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface UseArtistSubmissionWorkflowProps {
  initialData?: Artist;
}

export function useArtistSubmissionWorkflow({ initialData }: UseArtistSubmissionWorkflowProps) {
  const t = useTranslations("artist");
  const [actionError, setActionError] = useState<Error | null>(null);

  const create = useCreateArtistWithUpload({ meta: INLINE_ERROR });
  const update = useUpdateArtistWithUpload({ meta: INLINE_ERROR });
  const { mutateAsync: createArtist, isPending: isCreating } = create;
  const { mutateAsync: updateArtist, isPending: isUpdating } = update;
  const uploadProgress = Math.max(create.uploadProgress, update.uploadProgress);

  const submit = async (data: ArtistFormValues) => {
    setActionError(null);

    try {
      if (initialData) {
        await updateArtist({ id: initialData.id, payload: data });
      } else {
        await createArtist(data);
      }
    } catch (error: unknown) {
      const normalizedError = error instanceof Error ? error : new ApiError(t("form.saveFailed"));
      setActionError(normalizedError);
      throw normalizedError;
    }
  };

  return {
    submit,
    uploadProgress,
    isUploading: create.isUploading || update.isUploading,
    isPending: isCreating || isUpdating,
    actionError,
  };
}
