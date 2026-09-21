"use client";

import ProgressBar from "@/features/transcoding/components/ProgressBar/ProgressBar";
import FormField from "@/shared/ui/FormField";
import FormFileInput from "@/shared/ui/FormFileInput";
import Modal from "@/shared/ui/Modal/Modal";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
import { useWatch } from "react-hook-form";
import { useEpisodeManagerContext } from "../../context/EpisodeManagerContext";

export default function EpisodeModal() {
  const {
    isModalOpen,
    closeEditor,
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

  return (
    <Modal isOpen={isModalOpen} onClose={closeEditor}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 300 }}>
        <Typography sx={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", pr: "44px" }}>
          {editingEpisode ? "Edit Episode" : "Add Episode"}
        </Typography>
        <FormField
          label="Episode Number"
          type="number"
          placeholder="Episode Number"
          name="number"
          register={register}
          error={errors.number}
          valueAsNumber
        />
        <FormField label="Name" placeholder="Name" name="name" register={register} error={errors.name} />
        <FormField label="Description" placeholder="Description" name="description" register={register} error={errors.description} />

        {!editingEpisode && (
          <FormFileInput
            label="Video File"
            register={register}
            setValue={setValue}
            selectedFile={selectedVideoFile}
            name="videoFile"
            accept="video/*"
            error={errors.videoFile}
            id="episode-video-file"
          />
        )}

        {isUploading && <ProgressBar progress={uploadProgress} />}

        <Button type="submit" disabled={isUploading || createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending || isUploading ? "Uploading..." : editingEpisode ? "Update" : "Create"}
        </Button>
      </Box>
    </Modal>
  );
}
