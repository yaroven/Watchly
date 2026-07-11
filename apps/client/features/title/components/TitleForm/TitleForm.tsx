"use client";

import { CreateTitleSchema, Title, TitleFormValues, TitleType, UpdateTitleSchema } from "@/features/title/schemas/title";
import ProgressBar from "@/features/transcoding/components/ProgressBar";
import FormButton from "@/shared/ui/FormButton";
import FormField from "@/shared/ui/FormField";
import FormFileInput from "@/shared/ui/FormFileInput";
import Modal from "@/shared/ui/Modal";
import { zodResolver } from "@hookform/resolvers/zod";
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
        error={errors.posterFile}
        id="title-poster-file"
      />

      <FormField label="Type" name="type" register={register} error={errors.type} as="select" disabled={isEditing}>
        <option value="">Select type</option>
        <option value={TitleType.MOVIE}>Movie</option>
        <option value={TitleType.SERIES}>Series</option>
      </FormField>

      <Activity mode={selectedType === TitleType.MOVIE && !isEditing ? "visible" : "hidden"}>
        <FormFileInput
          label="Video File"
          register={register}
          setValue={setValue}
          selectedFile={selectedVideoFile}
          name="videoFile"
          accept="video/*"
          error={errors.videoFile}
          id="title-video-file"
        />
      </Activity>

      {isUploading && <ProgressBar progress={uploadProgress} />}

      {actionError && <div className={styles.errorAlert}>Error: {actionError.message}</div>}
      <FormButton disabled={isPending || (!isDirty && !isEditing)} type="submit">
        {isPending ? (isUploading ? "Uploading Video..." : "Saving Title...") : isEditing ? "Update Title" : "Create Title"}
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
