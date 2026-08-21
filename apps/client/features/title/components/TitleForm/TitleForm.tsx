"use client";

import { CreateTitleSchema, Title, TitleFormValues, TitleType, UpdateTitleSchema } from "@/features/title/schemas/title";
import ProgressBar from "@/features/transcoding/components/ProgressBar";
import FormField from "@/shared/ui/FormField";
import FormFileInput from "@/shared/ui/FormFileInput";
import Modal from "@/shared/ui/Modal";
import Select from "@/shared/ui/Select";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@shared/ui/Button";
import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Activity, useEffect, useState } from "react";
import { Resolver, useForm, useWatch } from "react-hook-form";
import styles from "./TitleForm.module.scss";
import { useTitleSubmissionWorkflow } from "./useTitleSubmissionWorkflow";

interface TitleFormProps {
  initialData?: Title;
}

export default function TitleForm({ initialData }: TitleFormProps) {
  const router = useRouter();
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const defaultValues = initialData
    ? {
        name: initialData.name,
        description: initialData.description,
        type: initialData.type,
      }
    : undefined;

  const isEditing = !!initialData;
  const schema = isEditing ? UpdateTitleSchema : CreateTitleSchema;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
    setValue,
  } = useForm<TitleFormValues>({
    resolver: zodResolver(schema) as Resolver<TitleFormValues>,
    mode: "onBlur",
    defaultValues,
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description,
        type: initialData.type,
        posterFile: undefined,
        videoFile: undefined,
      });
      return;
    }

    reset({
      name: "",
      description: "",
      type: TitleType.MOVIE,
      posterFile: undefined,
      videoFile: undefined,
    });
  }, [initialData, reset]);

  const selectedType = useWatch({
    control,
    name: "type",
    defaultValue: TitleType.MOVIE,
  });
  const selectedVideoFile = useWatch({
    control,
    name: "videoFile",
  });
  const selectedPosterFile = useWatch({
    control,
    name: "posterFile",
  });
  const { submit, uploadProgress, isUploading, isPending, actionError, createdTitleId } = useTitleSubmissionWorkflow({ initialData });

  const onSubmit = async (data: TitleFormValues) => {
    try {
      await submit(data);
      reset(
        isEditing
          ? {
              name: data.name,
              description: data.description,
              type: data.type,
              posterFile: undefined,
            }
          : {
              name: "",
              description: "",
              type: TitleType.MOVIE,
              posterFile: undefined,
            },
      );
      setIsSuccessModalOpen(true);
    } catch {}
  };

  const closeSuccessModal = () => setIsSuccessModalOpen(false);

  return (
    <form className={styles.titleForm} onSubmit={handleSubmit(onSubmit)}>
      <FormField label="Name" placeholder="Name" name="name" register={register} error={errors.name} />
      <FormField label="Description" placeholder="Description" name="description" register={register} error={errors.description} />
      <FormFileInput
        label="Banner"
        register={register}
        setValue={setValue}
        selectedFile={selectedPosterFile}
        name="posterFile"
        accept="image/*"
        hint="Any image format"
        disabled={isPending}
        error={errors.posterFile}
        id="title-poster-file"
      />

      <Select
        label="Type"
        name="type"
        control={control}
        error={errors.type}
        disabled={isEditing}
        placeholder="Select type"
        options={[
          { value: TitleType.MOVIE, label: "Movie" },
          { value: TitleType.SERIES, label: "Series" },
        ]}
      />

      <Activity mode={selectedType === TitleType.MOVIE && !isEditing ? "visible" : "hidden"}>
        <FormFileInput
          label="Video File"
          register={register}
          setValue={setValue}
          selectedFile={selectedVideoFile}
          name="videoFile"
          accept="video/*"
          hint="Any video format"
          disabled={isPending}
          error={errors.videoFile}
          id="title-video-file"
        />
      </Activity>

      {isUploading && <ProgressBar progress={uploadProgress} />}

      {actionError && <div className={styles.errorAlert}>Error: {actionError.message}</div>}
      <Button disabled={isPending || (!isDirty && !isEditing)} type="submit">
        {isPending ? (isUploading ? "Uploading Video..." : "Saving TitleCard...") : isEditing ? "Update TitleCard" : "Create TitleCard"}
      </Button>

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
