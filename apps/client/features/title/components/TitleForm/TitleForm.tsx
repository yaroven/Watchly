"use client";

import { AgeRating, CreateTitleSchema, Title, TitleFormValues, TitleType, UpdateTitleSchema } from "@/features/title/schemas/title";
import ProgressBar from "@/features/transcoding/components/ProgressBar";
import { ADMIN } from "@/shared/lib/routes";
import FormField from "@/shared/ui/FormField";
import FormFileInput from "@/shared/ui/FormFileInput";
import Modal from "@/shared/ui/Modal";
import Select from "@/shared/ui/Select";
import { zodResolver } from "@hookform/resolvers/zod";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
import { useRouter } from "next/navigation";
import { Activity, useEffect, useState } from "react";
import { Resolver, useForm, useWatch } from "react-hook-form";
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
        ageRating: initialData.ageRating,
        country: initialData.country,
        releaseDate: initialData.releaseDate.slice(0, 10),
        language: initialData.language,
        trailerUrl: initialData.trailerUrl,
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
        ageRating: initialData.ageRating,
        country: initialData.country,
        releaseDate: initialData.releaseDate.slice(0, 10),
        language: initialData.language,
        trailerUrl: initialData.trailerUrl,
        posterFile: undefined,
        videoFile: undefined,
      });
      return;
    }

    reset({
      name: "",
      description: "",
      type: TitleType.MOVIE,
      ageRating: undefined,
      country: "",
      releaseDate: "",
      language: "",
      trailerUrl: "",
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
              ageRating: data.ageRating,
              country: data.country,
              releaseDate: data.releaseDate,
              language: data.language,
              trailerUrl: data.trailerUrl,
              posterFile: undefined,
            }
          : {
              name: "",
              description: "",
              type: TitleType.MOVIE,
              ageRating: undefined,
              country: "",
              releaseDate: "",
              language: "",
              trailerUrl: "",
              posterFile: undefined,
            },
      );
      setIsSuccessModalOpen(true);
    } catch {}
  };

  const closeSuccessModal = () => setIsSuccessModalOpen(false);

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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

      <Select
        label="Age Rating"
        name="ageRating"
        control={control}
        error={errors.ageRating}
        placeholder="Select age rating"
        options={[
          { value: AgeRating.AGE_0, label: "All Ages" },
          { value: AgeRating.AGE_12, label: "12+" },
          { value: AgeRating.AGE_16, label: "16+" },
          { value: AgeRating.AGE_18, label: "18+" },
        ]}
      />

      <FormField label="Country" placeholder="Country of origin" name="country" register={register} error={errors.country} />
      <FormField type="date" label="Release Date" name="releaseDate" register={register} error={errors.releaseDate} />
      <FormField label="Language" placeholder="Language" name="language" register={register} error={errors.language} />
      <FormField type="url" label="Trailer URL" placeholder="https://..." name="trailerUrl" register={register} error={errors.trailerUrl} />

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

      {actionError && <Alert severity="error">Error: {actionError.message}</Alert>}
      <Button disabled={isPending || (!isDirty && !isEditing)} type="submit">
        {isPending ? (isUploading ? "Uploading Video..." : "Saving Title...") : isEditing ? "Update Title" : "Create Title"}
      </Button>

      <Modal isOpen={isSuccessModalOpen} onClose={closeSuccessModal} size="sm">
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "18px" }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "18px",
              backgroundColor: "rgba(39,194,55,.16)",
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 30, color: "#27c237" }} />
          </Box>

          <Typography sx={{ fontSize: "24px", fontWeight: 700, color: "#ffffff" }}>
            Title {initialData ? "updated" : "added"} successfully!
          </Typography>

          <Box sx={{ display: "flex", gap: "12px", width: "100%", mt: "6px" }}>
            <Button
              variant="outlined"
              sx={{ flex: 1 }}
              onClick={() => {
                closeSuccessModal();
                router.push(ADMIN.TITLES);
              }}
            >
              View All Titles
            </Button>
            <Button
              sx={{ flex: 1 }}
              onClick={() => {
                const id = initialData?.id || createdTitleId;
                if (id) {
                  closeSuccessModal();
                  router.push(ADMIN.TITLES_EDIT(id));
                }
              }}
            >
              View Title
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}
