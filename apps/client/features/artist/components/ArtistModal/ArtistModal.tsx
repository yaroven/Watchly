"use client";

import { Artist, ArtistFormValues, createArtistFormSchema } from "@/features/artist/schemas/artist";
import FormField from "@/shared/ui/FormField";
import FormFileInput from "@/shared/ui/FormFileInput";
import Modal from "@/shared/ui/Modal";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useApiErrorMessage } from "@shared/api/use-api-error-message";
import { tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import UploadProgress from "@shared/ui/UploadProgress";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { Resolver, useForm, useWatch } from "react-hook-form";
import { useArtistSubmissionWorkflow } from "./useArtistSubmissionWorkflow";

interface ArtistModalProps {
  isOpen: boolean;
  onClose: () => void;
  artist?: Artist;
}

export default function ArtistModal({ isOpen, onClose, artist }: ArtistModalProps) {
  const t = useTranslations("artist");
  const isEditing = !!artist;
  const schema = useMemo(() => createArtistFormSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
    setValue,
  } = useForm<ArtistFormValues>({
    resolver: zodResolver(schema) as Resolver<ArtistFormValues>,
    mode: "onBlur",
    defaultValues: { name: artist?.name ?? "" },
  });

  useEffect(() => {
    if (isOpen) reset({ name: artist?.name ?? "", photoFile: undefined });
  }, [isOpen, artist, reset]);

  const selectedPhotoFile = useWatch({ control, name: "photoFile" });
  const describeError = useApiErrorMessage();
  const { submit, uploadProgress, isUploading, isPending, actionError } = useArtistSubmissionWorkflow({ initialData: artist });

  const onSubmit = async (data: ArtistFormValues) => {
    try {
      await submit(data);
      onClose();
    } catch {}
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Typography sx={{ fontSize: "24px", fontWeight: 700, color: tokens.text.primary }}>
          {isEditing ? t("form.editTitle") : t("form.addTitle")}
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <FormField
            label={t("form.nameLabel")}
            placeholder={t("form.namePlaceholder")}
            name="name"
            register={register}
            error={errors.name}
          />

          <FormFileInput
            label={t("form.photoLabel")}
            register={register}
            setValue={setValue}
            selectedFile={selectedPhotoFile}
            name="photoFile"
            accept="image/*"
            hint={t("form.photoHint")}
            disabled={isPending}
            error={errors.photoFile}
            id="artist-photo-file"
          />

          {isUploading && <UploadProgress progress={uploadProgress} />}
          {actionError && <Alert severity="error">{t("form.error", { message: describeError(actionError) ?? "" })}</Alert>}

          <Button disabled={isPending || (!isDirty && !isEditing)} type="submit">
            {isPending
              ? isUploading
                ? t("form.uploadingPhoto")
                : t("form.saving")
              : isEditing
                ? t("form.saveChanges")
                : t("form.submitAdd")}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
