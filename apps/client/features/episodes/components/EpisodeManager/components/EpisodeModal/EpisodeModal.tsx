"use client";

import { episodeTranslations } from "@/features/episodes/api/episode.translations";
import FormField from "@/shared/ui/FormField";
import FormFileInput from "@/shared/ui/FormFileInput";
import Modal from "@/shared/ui/Modal/Modal";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useApiErrorMessage } from "@shared/api/use-api-error-message";
import { useEditingLanguage } from "@shared/lib/editing-language";
import { tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import { EditingLanguageNote } from "@shared/ui/LocalePicker";
import ContentTranslationEditor from "@shared/ui/TranslationEditor/ContentTranslationEditor";
import UploadProgress from "@shared/ui/UploadProgress";
import { useTranslations } from "next-intl";
import { useWatch } from "react-hook-form";
import { useEpisodeManagerContext } from "../../context/EpisodeManagerContext";

export default function EpisodeModal() {
  const t = useTranslations("episodes");
  const { translationLocale } = useEditingLanguage();
  const describeError = useApiErrorMessage();
  const {
    isModalOpen,
    closeEditor,
    clearEditor,
    editingEpisode,
    register,
    handleSubmit,
    control,
    setValue,
    errors,
    isUploading,
    uploadProgress,
    createMutation,
    updateMutation,
    onSubmit,
  } = useEpisodeManagerContext();
  const selectedVideoFile = useWatch({
    control,
    name: "videoFile",
  });

  const saveError = describeError(createMutation.error ?? updateMutation.error, { 400: t("form.numberTaken") });
  const isEnglish = !editingEpisode || !translationLocale;

  const handleClose = () => {
    closeEditor();
  };

  return (
    <Modal isOpen={isModalOpen} onClose={handleClose} onExited={clearEditor}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 300 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "6px", pr: "44px" }}>
          <Typography component="h2" sx={{ fontSize: "22px", fontWeight: 700, color: tokens.text.primary }}>
            {editingEpisode ? t("form.editTitle") : t("form.addTitle")}
          </Typography>
          <EditingLanguageNote isNew={!editingEpisode} />
        </Box>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: isEnglish ? "flex" : "none", flexDirection: "column", gap: "20px" }}
        >
          <FormField
            label={t("form.number")}
            type="number"
            placeholder={t("form.number")}
            name="number"
            register={register}
            error={errors.number}
            valueAsNumber
          />
          <FormField label={t("form.name")} placeholder={t("form.name")} name="name" register={register} error={errors.name} />
          <FormField
            label={t("form.description")}
            placeholder={t("form.description")}
            name="description"
            register={register}
            error={errors.description}
          />

          {!editingEpisode && (
            <FormFileInput
              label={t("form.videoFile")}
              register={register}
              setValue={setValue}
              selectedFile={selectedVideoFile}
              name="videoFile"
              accept="video/*"
              error={errors.videoFile}
              id="episode-video-file"
            />
          )}

          {isUploading && <UploadProgress progress={uploadProgress} />}

          {saveError && <Alert severity="error">{saveError}</Alert>}
          <Button type="submit" disabled={isUploading || createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending || isUploading
              ? t("form.uploading")
              : editingEpisode
                ? t("form.update")
                : t("form.create")}
          </Button>
        </Box>
        {editingEpisode && !isEnglish && (
          <ContentTranslationEditor
            key={translationLocale}
            content={episodeTranslations}
            id={editingEpisode.id}
            locale={translationLocale!}
          />
        )}
      </Box>
    </Modal>
  );
}
