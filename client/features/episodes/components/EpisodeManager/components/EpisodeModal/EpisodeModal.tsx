"use client";

import ProgressBar from "@/features/transcoding/components/ProgressBar/ProgressBar";
import FormButton from "@/shared/ui/FormButton";
import FormField from "@/shared/ui/FormField";
import FormFileInput from "@/shared/ui/FormFileInput";
import Modal from "@/shared/ui/Modal/Modal";
import { useWatch } from "react-hook-form";
import { useEpisodeManagerContext } from "../../context/EpisodeManagerContext";
import styles from "./EpisodeModal.module.scss";

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
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <h3>{editingEpisode ? "Edit Episode" : "Add Episode"}</h3>
        <FormField
          label="Episode Number"
          type="number"
          placeholder="Episode Number"
          name="number"
          register={register}
          error={errors.number}
          valueAsNumber
        />
        <FormField
          label="Name"
          placeholder="Name"
          name="name"
          register={register}
          error={errors.name}
        />
        <FormField
          label="Description"
          placeholder="Description"
          name="description"
          register={register}
          error={errors.description}
        />

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

        <FormButton
          type="submit"
          disabled={isUploading || createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending || isUploading
            ? "Uploading..."
            : editingEpisode
              ? "Update"
              : "Create"}
        </FormButton>
      </form>
    </Modal>
  );
}
