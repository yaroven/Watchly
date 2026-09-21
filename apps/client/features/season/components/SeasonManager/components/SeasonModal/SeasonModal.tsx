"use client";

import FormField from "@/shared/ui/FormField";
import FormFileInput from "@/shared/ui/FormFileInput";
import Modal from "@/shared/ui/Modal/Modal";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
import { useWatch } from "react-hook-form";
import { useSeasonManagerContext } from "../../context/SeasonManagerContext";

export default function SeasonModal() {
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
          {editingSeason ? "Edit Season" : "Add Season"}
        </Typography>
        <FormField
          label="Season Number"
          type="number"
          placeholder="Season Number"
          name="number"
          register={register}
          error={errors.number}
          valueAsNumber
        />
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
          id="season-poster-file"
        />
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingSeason ? "Update" : "Create"}
        </Button>
      </Box>
    </Modal>
  );
}
