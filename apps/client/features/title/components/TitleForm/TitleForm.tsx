"use client";

import useGenres from "@/features/genre/api/use-genres";
import { CreateTitleSchema, Title, TitleFormValues, TitleType, UpdateTitleSchema } from "@/features/title/schemas/title";
import ProgressBar from "@/features/transcoding/components/ProgressBar";
import { ADMIN } from "@/shared/lib/routes";
import Modal from "@/shared/ui/Modal";
import { zodResolver } from "@hookform/resolvers/zod";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Resolver, useForm, useWatch } from "react-hook-form";
import CreateRail from "./components/CreateRail";
import FormSection from "./components/FormSection";
import TitleCreated from "./components/TitleCreated";
import ValidationSummary from "./components/ValidationSummary";
import AccessibilityFields from "./components/fields/AccessibilityFields";
import ClassificationFields from "./components/fields/ClassificationFields";
import IdentityFields from "./components/fields/IdentityFields";
import MediaFields from "./components/fields/MediaFields";
import { getTitleReadiness } from "./model/titleReadiness";
import { useTitleSubmissionWorkflow } from "./useTitleSubmissionWorkflow";

interface TitleFormProps {
  initialData?: Title;
}

const emptyValues: TitleFormValues = {
  name: "",
  description: "",
  type: TitleType.MOVIE,
  ageRating: undefined as unknown as TitleFormValues["ageRating"],
  country: "",
  releaseDate: "",
  language: "",
  trailerUrl: "",
  runtime: 0,
  network: "",
  director: "",
  closedCaption: false,
  genreIds: [],
  posterFile: undefined,
  videoFile: undefined,
};

const toFormValues = (title: Title): TitleFormValues => ({
  name: title.name,
  description: title.description,
  type: title.type,
  ageRating: title.ageRating,
  country: title.country,
  releaseDate: title.releaseDate.slice(0, 10),
  language: title.language,
  trailerUrl: title.trailerUrl,
  runtime: title.runtime,
  network: title.network,
  director: title.director,
  closedCaption: title.closedCaption,
  genreIds: title.genres?.map((genre) => genre.id) ?? [],
  posterFile: undefined,
  videoFile: undefined,
});

export default function TitleForm({ initialData }: TitleFormProps) {
  const router = useRouter();
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const isEditing = !!initialData;
  const schema = isEditing ? UpdateTitleSchema : CreateTitleSchema;

  const form = useForm<TitleFormValues>({
    resolver: zodResolver(schema) as Resolver<TitleFormValues>,
    mode: "onBlur",
    defaultValues: initialData ? toFormValues(initialData) : emptyValues,
  });

  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = form;

  useEffect(() => {
    reset(initialData ? toFormValues(initialData) : emptyValues);
  }, [initialData, reset]);

  const values = useWatch({ control }) as Partial<TitleFormValues>;
  const selectedType = values.type ?? TitleType.MOVIE;
  const showVideoField = selectedType === TitleType.MOVIE && !isEditing;

  const { data: genreData } = useGenres({ limit: 100 });
  const genreNames = (genreData?.items ?? []).filter((genre) => values.genreIds?.includes(genre.id)).map((genre) => genre.name);

  const { submit, resetWorkflow, uploadProgress, uploadParts, isUploading, isPending, actionError, createdTitle } =
    useTitleSubmissionWorkflow({ initialData });

  const onSubmit = async (data: TitleFormValues) => {
    try {
      await submit(data);
      if (isEditing) {
        reset({ ...data, posterFile: undefined, videoFile: undefined });
        setIsSuccessModalOpen(true);
      }
    } catch {}
  };

  const closeSuccessModal = () => setIsSuccessModalOpen(false);

  // A freshly created title takes over the screen — the form has nothing left to say.
  if (!isEditing && createdTitle) {
    return (
      <TitleCreated
        title={createdTitle}
        onCreateAnother={() => {
          reset(emptyValues);
          resetWorkflow();
        }}
      />
    );
  }

  const readiness = getTitleReadiness(values, { needsVideo: showVideoField });

  const sectionStatus = (sectionKey: string) => {
    const section = readiness.sections.find((item) => item.key === sectionKey);
    if (!section) return undefined;
    const left = section.items.filter((item) => !item.done).length;
    return left ? { label: `${left} LEFT`, tone: "todo" as const } : { label: "COMPLETE", tone: "done" as const };
  };

  if (isEditing) {
    return (
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <ValidationSummary errors={errors} />

        <IdentityFields form={form} columns={1} />
        <ClassificationFields form={form} columns={1} isEditing selectedType={selectedType} />
        <MediaFields form={form} showVideoField={false} disabled={isPending} />
        <AccessibilityFields form={form} />

        {isUploading && <ProgressBar progress={uploadProgress} />}
        {actionError && <Alert severity="error">Error: {actionError.message}</Alert>}

        <Button disabled={isPending} type="submit">
          {isPending ? "Saving Title..." : "Update Title"}
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

            <Typography sx={{ fontSize: "24px", fontWeight: 700, color: "#ffffff" }}>Title updated successfully!</Typography>

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
              <Button sx={{ flex: 1 }} onClick={closeSuccessModal}>
                Keep editing
              </Button>
            </Box>
          </Box>
        </Modal>
      </Box>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 360px" }, gap: "28px", alignItems: "start" }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <ValidationSummary errors={errors} />

        <FormSection
          index="01"
          title="Identity"
          description="What the title is called and who made it."
          status={sectionStatus("identity")}
          anchorId="section-identity"
        >
          <IdentityFields form={form} columns={2} />
        </FormSection>

        <FormSection
          index="02"
          title="Format & classification"
          description="Type decides the rest of the form. Pick it first."
          status={sectionStatus("classification")}
          anchorId="section-classification"
        >
          <ClassificationFields form={form} columns={2} isEditing={false} selectedType={selectedType} />
        </FormSection>

        <FormSection
          index="03"
          title="Media"
          description={
            showVideoField
              ? "Poster, trailer link, and the source video."
              : "Poster and trailer only — episode video lives with the episode."
          }
          status={sectionStatus("media")}
          anchorId="section-media"
        >
          <MediaFields form={form} showVideoField={showVideoField} disabled={isPending} />
        </FormSection>

        <FormSection index="04" title="Accessibility" description="What viewers get beyond the picture." anchorId="section-accessibility">
          <AccessibilityFields form={form} />
        </FormSection>

        {actionError && (
          <Alert severity="error">
            Error: {actionError.message}
            {" — nothing was kept. Your entries are still here."}
          </Alert>
        )}
      </Box>

      <CreateRail
        values={values}
        readiness={readiness}
        genreNames={genreNames}
        isPending={isPending}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        uploadParts={uploadParts}
      />
    </Box>
  );
}
