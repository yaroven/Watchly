"use client";

import { seasonTranslations } from "@/features/season/api/season.translations";
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
import { useSeasonManagerContext } from "../../context/SeasonManagerContext";

export default function SeasonModal() {
  const t = useTranslations("season");
  const { translationLocale } = useEditingLanguage();
  const describeError = useApiErrorMessage();
  const {
    isModalOpen,
    closeEditor,
    clearEditor,
    editingSeason,
    register,
    handleSubmit,
    control,
    setValue,
    errors,
    createMutation,
    updateMutation,
    onSubmit,
  } = useSeasonManagerContext();
  const selectedPosterFile = useWatch({
    control,
    name: "posterFile",
  });

  const saveError = describeError(createMutation.error ?? updateMutation.error);
  const isEnglish = !editingSeason || !translationLocale;

  const handleClose = () => {
    closeEditor();
  };

  return (
    <Modal isOpen={isModalOpen} onClose={handleClose} onExited={clearEditor}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 300 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "6px", pr: "44px" }}>
          <Typography component="h2" sx={{ fontSize: "22px", fontWeight: 700, color: tokens.text.primary }}>
            {editingSeason ? t("form.editTitle") : t("form.addTitle")}
          </Typography>
          <EditingLanguageNote isNew={!editingSeason} />
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
          <FormFileInput
            label={t("form.banner")}
            register={register}
            setValue={setValue}
            selectedFile={selectedPosterFile}
            name="posterFile"
            accept="image/*"
            error={errors.posterFile}
            id="season-poster-file"
          />
          {saveError && <Alert severity="error">{saveError}</Alert>}
          {(createMutation.isUploading || updateMutation.isUploading) && (
            <UploadProgress progress={Math.max(createMutation.uploadProgress, updateMutation.uploadProgress)} />
          )}
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending ? t("form.saving") : editingSeason ? t("form.update") : t("form.create")}
          </Button>
        </Box>
        {editingSeason && !isEnglish && (
          <ContentTranslationEditor
            key={translationLocale}
            content={seasonTranslations}
            id={editingSeason.id}
            locale={translationLocale!}
          />
        )}
      </Box>
    </Modal>
  );
}
