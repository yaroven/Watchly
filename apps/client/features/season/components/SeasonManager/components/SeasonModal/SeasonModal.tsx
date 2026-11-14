"use client";

import FormField from "@/shared/ui/FormField";
import FormFileInput from "@/shared/ui/FormFileInput";
import Modal from "@/shared/ui/Modal/Modal";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
import { useTranslations } from "next-intl";
import { useWatch } from "react-hook-form";
import { useSeasonManagerContext } from "../../context/SeasonManagerContext";

export default function SeasonModal() {
  const t = useTranslations("season");
  const {
    isModalOpen,
    closeEditor,
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

  return (
    <Modal isOpen={isModalOpen} onClose={closeEditor}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 300 }}>
        <Typography sx={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", pr: "44px" }}>
          {editingSeason ? t("form.editTitle") : t("form.addTitle")}
        </Typography>
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
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending ? t("form.saving") : editingSeason ? t("form.update") : t("form.create")}
        </Button>
      </Box>
    </Modal>
  );
}
