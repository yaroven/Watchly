"use client";

import { useGenres } from "@/features/genre";
import { createCreateTitleSchema, createUpdateTitleSchema, Title, TitleFormValues, TitleType } from "@/features/title/schemas/title";
import { useRouter } from "@/i18n/navigation";
import { ADMIN } from "@/shared/lib/routes";
import Modal from "@/shared/ui/Modal";
import { zodResolver } from "@hookform/resolvers/zod";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useApiErrorMessage } from "@shared/api/use-api-error-message";
import { tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import UploadProgress from "@shared/ui/UploadProgress";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useState } from "react";
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

export interface TitleEditStatus {
  isDirty: boolean;
  isPending: boolean;
  savedAt: Date | null;
}

interface TitleFormProps {
  initialData?: Title;
  formId?: string;
  onEditStatusChange?: (status: TitleEditStatus) => void;
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

export default function TitleForm({ initialData, formId, onEditStatusChange }: TitleFormProps) {
  const t = useTranslations("title.form");
  const tValidation = useTranslations("title.validation");
  const router = useRouter();
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const hasExternalActions = !!formId;

  const isEditing = !!initialData;
  const schema = useMemo(
    () => (isEditing ? createUpdateTitleSchema(tValidation) : createCreateTitleSchema(tValidation)),
    [isEditing, tValidation],
  );

  const form = useForm<TitleFormValues>({
    resolver: zodResolver(schema) as Resolver<TitleFormValues>,
    mode: "onBlur",
    defaultValues: initialData ? toFormValues(initialData) : emptyValues,
  });

  const {
    handleSubmit,
    control,
    formState: { errors, isDirty },
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

  const describeError = useApiErrorMessage();
  const { submit, resetWorkflow, uploadProgress, uploadParts, isUploading, isPending, actionError, createdTitle } =
    useTitleSubmissionWorkflow({ initialData });

  useEffect(() => {
    onEditStatusChange?.({ isDirty, isPending, savedAt });
  }, [onEditStatusChange, isDirty, isPending, savedAt]);

  const onSubmit = async (data: TitleFormValues) => {
    try {
      await submit(data);
      if (isEditing) {
        reset({ ...data, posterFile: undefined, videoFile: undefined });
        if (hasExternalActions) setSavedAt(new Date());
        else setIsSuccessModalOpen(true);
      }
    } catch {}
  };

  const closeSuccessModal = () => setIsSuccessModalOpen(false);

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
    return left
      ? { label: t("sectionLeft", { count: left }), tone: "todo" as const }
      : { label: t("sectionComplete"), tone: "done" as const };
  };

  if (isEditing) {
    return (
      <Box
        component="form"
        id={formId}
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: "flex", flexDirection: "column", gap: hasExternalActions ? "36px" : "20px" }}
      >
        <ValidationSummary errors={errors} />

        {hasExternalActions ? (
          <>
            <FieldGroup title={t("sections.identity.title")}>
              <IdentityFields form={form} columns={1} />
            </FieldGroup>
            <FieldGroup title={t("sections.classification.title")}>
              <ClassificationFields form={form} columns={2} isEditing selectedType={selectedType} />
            </FieldGroup>
            <FieldGroup title={t("sections.media.title")}>
              <MediaFields form={form} showVideoField={false} disabled={isPending} />
            </FieldGroup>
            <FieldGroup title={t("sections.accessibility.title")}>
              <AccessibilityFields form={form} />
            </FieldGroup>
          </>
        ) : (
          <>
            <IdentityFields form={form} columns={1} />
            <ClassificationFields form={form} columns={1} isEditing selectedType={selectedType} />
            <MediaFields form={form} showVideoField={false} disabled={isPending} />
            <AccessibilityFields form={form} />
          </>
        )}

        {isUploading && <UploadProgress progress={uploadProgress} />}
        {actionError && <Alert severity="error">{t("error", { message: describeError(actionError) ?? "" })}</Alert>}

        {!hasExternalActions && (
          <Button disabled={isPending} type="submit">
            {isPending ? t("saving") : t("update")}
          </Button>
        )}

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
              <CheckCircleIcon sx={{ fontSize: 30, color: tokens.feedback.success }} />
            </Box>

            <Typography sx={{ fontSize: "24px", fontWeight: 700, color: tokens.text.primary }}>{t("updatedSuccess")}</Typography>

            <Box sx={{ display: "flex", gap: "12px", width: "100%", mt: "6px" }}>
              <Button
                variant="outlined"
                sx={{ flex: 1 }}
                onClick={() => {
                  closeSuccessModal();
                  router.push(ADMIN.TITLES);
                }}
              >
                {t("viewAllTitles")}
              </Button>
              <Button sx={{ flex: 1 }} onClick={closeSuccessModal}>
                {t("keepEditing")}
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
          title={t("sections.identity.title")}
          description={t("sections.identity.description")}
          status={sectionStatus("identity")}
          anchorId="section-identity"
        >
          <IdentityFields form={form} columns={2} />
        </FormSection>

        <FormSection
          index="02"
          title={t("sections.classification.title")}
          description={t("sections.classification.description")}
          status={sectionStatus("classification")}
          anchorId="section-classification"
        >
          <ClassificationFields form={form} columns={2} isEditing={false} selectedType={selectedType} />
        </FormSection>

        <FormSection
          index="03"
          title={t("sections.media.title")}
          description={showVideoField ? t("sections.media.descriptionWithVideo") : t("sections.media.descriptionWithoutVideo")}
          status={sectionStatus("media")}
          anchorId="section-media"
        >
          <MediaFields form={form} showVideoField={showVideoField} disabled={isPending} />
        </FormSection>

        <FormSection
          index="04"
          title={t("sections.accessibility.title")}
          description={t("sections.accessibility.description")}
          anchorId="section-accessibility"
        >
          <AccessibilityFields form={form} />
        </FormSection>

        {actionError && <Alert severity="error">{t("createError", { message: describeError(actionError) ?? "" })}</Alert>}
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

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="fieldset" sx={{ m: 0, p: 0, border: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
      <Typography
        component="legend"
        sx={{ p: 0, mb: "16px", width: "100%", fontSize: "13px", fontWeight: 600, color: tokens.text.secondary }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}
