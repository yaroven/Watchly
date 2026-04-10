"use client";

import { TitleService } from "@/app/services/title.service";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Activity, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import {
  CreateTitleDto,
  CreateTitleSchema,
  Title,
  TitleType,
  UpdateTitleSchema,
} from "../../../types/title";
import Modal from "../../shared/Modal";
import ProgressBar from "../../shared/ProgressBar";
import FormButton from "../FormButton";
import FormField from "../FormField";
import FormFileInput from "../FormFileInput";
import styles from "./TitleForm.module.scss";

interface TitleFormProps {
  initialData?: Title;
}

export default function TitleForm({ initialData }: TitleFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

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

  const { mutate, isPending, error, data } = useMutation({
    mutationFn: async (data: CreateTitleDto) => {
      let title: Title;

      if (initialData) {
        title = await TitleService.update(initialData.id, data);
      } else {
        const { videoFile, ...payload } = data;
        title = await TitleService.createTitle(payload);

        if (data.type === TitleType.MOVIE && videoFile?.[0]) {
          const file = videoFile[0];
          const uploadUrl = await TitleService.getUploadUrl(title.id);
          await TitleService.uploadToS3(uploadUrl, file, (progress) => {
            setUploadProgress(progress);
          });
        }
      }
      return title;
    },
    onSuccess: () => {
      if (initialData) {
        queryClient.invalidateQueries({ queryKey: ["title", initialData.id] });
      } else {
        reset();
      }
      setIsSuccessModalOpen(true);
    },
  });

  const isUploading = uploadProgress > 0 && uploadProgress < 100;

  return (
    <form className={styles.titleForm} onSubmit={handleSubmit((data) => mutate(data))}>
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

      {error && <div className={styles.errorAlert}>Error: {error.message}</div>}
      <FormButton disabled={isPending || (!isDirty && !isEditing)} type="submit">
        {isPending
          ? isUploading
            ? "Uploading Video..."
            : "Saving Title..."
          : isEditing
            ? "Update Title"
            : "Create Title"}
      </FormButton>

      <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)}>
        <div className={styles.modalContent}>
          <CheckCircle className={styles.successIcon} />
          <h3>Title {initialData ? "updated" : "added"} successfully!</h3>
          <div className={styles.modalActions}>
            <button type="button" onClick={() => router.push("/admin/titles")}>
              View All Titles
            </button>
            <button
              type="button"
              onClick={() => {
                const id = initialData?.id || data?.id;
                if (id) {
                  router.push(`/admin/titles/${id}`);
                  setIsSuccessModalOpen(false);
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
