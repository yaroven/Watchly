"use client";

import { useCreateTitleWithUpload, useUpdateTitle } from "@/features/title/api/use-title-mutations";
import { Title, TitleFormValues } from "@/features/title/schemas/title";
import { ApiError } from "@/shared/api/api-error";
import { INLINE_ERROR } from "@shared/api/write-errors";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface UseTitleSubmissionWorkflowProps {
  initialData?: Title;
}

export function useTitleSubmissionWorkflow({ initialData }: UseTitleSubmissionWorkflowProps) {
  const t = useTranslations("title.form");
  const [uploadParts, setUploadParts] = useState<{ completed: number; total: number } | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const [createdTitle, setCreatedTitle] = useState<Title | null>(null);

  const create = useCreateTitleWithUpload({
    meta: INLINE_ERROR,
    onUploadPartProgress: (completed, total) => setUploadParts({ completed, total }),
  });
  const update = useUpdateTitle({ meta: INLINE_ERROR });
  const { mutateAsync: createTitle, isPending: isCreating } = create;
  const { mutateAsync: updateTitle, isPending: isUpdating } = update;
  const uploadProgress = Math.max(create.uploadProgress, update.uploadProgress);

  const submit = async (data: TitleFormValues) => {
    setActionError(null);
    setUploadParts(null);

    try {
      if (initialData) {
        await updateTitle({ id: initialData.id, payload: data });
        return { createdId: initialData.id };
      }

      const title = await createTitle(data);

      setCreatedTitle(title);
      return { createdId: title.id };
    } catch (error: unknown) {
      const normalizedError = error instanceof Error ? error : new ApiError(t("saveFailed"));
      setUploadParts(null);
      setActionError(normalizedError);
      throw normalizedError;
    }
  };

  const resetWorkflow = () => {
    setCreatedTitle(null);
    setUploadParts(null);
    setActionError(null);
  };

  return {
    submit,
    resetWorkflow,
    uploadProgress,
    uploadParts,
    isUploading: create.isUploading || update.isUploading,
    isPending: isCreating || isUpdating,
    actionError,
    createdTitle,
    createdTitleId: createdTitle?.id ?? null,
  };
}
