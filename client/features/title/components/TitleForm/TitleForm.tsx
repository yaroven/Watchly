"use client";

import TitleService from "@/features/title/api/title.service";
import { useCreateTitle, useUpdateTitle } from "@/features/title/api/use-title-mutations";
import {
  CreateTitleDto,
  CreateTitleSchema,
  Title,
  TitleType,
  UpdateTitleSchema,
} from "@/features/title/schemas/title";
import ProgressBar from "@/features/transcoding/components/ProgressBar";
import FormButton from "@/shared/ui/FormButton";
import FormField from "@/shared/ui/FormField";
import FormFileInput from "@/shared/ui/FormFileInput";
import Modal from "@/shared/ui/Modal";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Activity, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import styles from "./TitleForm.module.scss";

interface TitleFormProps {
  initialData?: Title;
}

export default function TitleForm({ initialData }: TitleFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [actionError, setActionError] = useState<Error | null>(null);
  const [createdTitleId, setCreatedTitleId] = useState<string | null>(null);

  const { mutateAsync: createTitle, isPending: isCreating } = useCreateTitle();
  const { mutateAsync: updateTitle, isPending: isUpdating } = useUpdateTitle();

  const defaultValues = initialData
    ? {
        name: initialData.name,
        description: initialData.description,
        posterUrl: initialData.posterUrl,
        type: initialData.type,
      }
    : undefined;

  const isEditing = !!initialData;
  const schema = isEditing ? UpdateTitleSchema : CreateTitleSchema;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    reset,
  } = useForm<CreateTitleDto>({
    resolver: zodResolver(schema) as Resolver<CreateTitleDto>,
    mode: "onBlur",
    defaultValues,
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedType = watch("type", TitleType.MOVIE);

  const onSubmit = async (data: CreateTitleDto) => {
    setActionError(null);
    try {
      if (isEditing && initialData) {
        await updateTitle({ id: initialData.id, payload: data });
        queryClient.invalidateQueries({ queryKey: ["title", initialData.id] });
        setIsSuccessModalOpen(true);
      } else {
        const { videoFile, ...payload } = data;
        const title = await createTitle(payload);

        if (data.type === TitleType.MOVIE && videoFile?.[0]) {
          const file = videoFile[0];
          const uploadUrl = await TitleService.getUploadUrl(title.id);
          await TitleService.uploadToS3(uploadUrl, file, (progress) => {
            setUploadProgress(progress);
          });
        }

        reset();
        setCreatedTitleId(title.id);
        setIsSuccessModalOpen(true);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err : new Error("Failed to save title"));
    }
  };

  const isUploading = uploadProgress > 0 && uploadProgress < 100;
  const isPending = isCreating || isUpdating;
  const closeSuccessModal = () => setIsSuccessModalOpen(false);

  return (
    <form className={styles.titleForm} onSubmit={handleSubmit(onSubmit)}>
      <FormField
        type="input"
        placeholder="Name"
        name="name"
        register={register}
        error={errors.name}
      />
      <FormField
        type="input"
        placeholder="Description"
        name="description"
        register={register}
        error={errors.description}
      />
      <FormField
        type="input"
        placeholder="Poster URL"
        name="posterUrl"
        register={register}
        error={errors.posterUrl}
      />

      <FormField
        name="type"
        register={register}
        error={errors.type}
        as="select"
        disabled={isEditing}
      >
        <option value="">Select type</option>
        <option value={TitleType.MOVIE}>Movie</option>
        <option value={TitleType.SERIES}>Series</option>
      </FormField>

      <Activity mode={selectedType === TitleType.MOVIE && !isEditing ? "visible" : "hidden"}>
        <FormFileInput
          register={register}
          name="videoFile"
          accept="video/*"
          error={errors.videoFile}
          id="title-video-file"
        />
      </Activity>

      {isUploading && <ProgressBar progress={uploadProgress} />}

      {actionError && <div className={styles.errorAlert}>Error: {actionError.message}</div>}
      <FormButton disabled={isPending || (!isDirty && !isEditing)} type="submit">
        {isPending
          ? isUploading
            ? "Uploading Video..."
            : "Saving Title..."
          : isEditing
            ? "Update Title"
            : "Create Title"}
      </FormButton>

      <Modal isOpen={isSuccessModalOpen} onClose={closeSuccessModal}>
        <div className={styles.modalContent}>
          <CheckCircle className={styles.successIcon} />
          <h3>Title {initialData ? "updated" : "added"} successfully!</h3>
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={() => {
                closeSuccessModal();
                router.push("/admin/titles");
              }}
            >
              View All Titles
            </button>
            <button
              type="button"
              onClick={() => {
                const id = initialData?.id || createdTitleId;
                if (id) {
                  closeSuccessModal();
                  router.push(`/admin/titles/${id}`);
                }
              }}
            >
              View Title
            </button>
          </div>
        </div>
      </Modal>
    </form>
  );
}
