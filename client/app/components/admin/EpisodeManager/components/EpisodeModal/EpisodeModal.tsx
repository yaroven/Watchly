"use client";

import Modal from "@/app/components/shared/Modal/Modal";
import ProgressBar from "@/app/components/shared/ProgressBar/ProgressBar";
import FormButton from "../../../FormButton";
import FormField from "../../../FormField";
import FormFileInput from "../../../FormFileInput";
import { useEpisodeManagerContext } from "../../context/EpisodeManagerContext";
import styles from "./EpisodeModal.module.scss";

export default function EpisodeModal() {
  const {
    isModalOpen,
    setIsModalOpen,
    editingEpisode,
    register,
    handleSubmit,
    errors,
    isUploading,
    uploadProgress,
    createMutation,
    updateMutation,
    onSubmit,
  } = useEpisodeManagerContext();

  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <h3>{editingEpisode ? "Edit Episode" : "Add Episode"}</h3>
        <FormField
          type="number"
          placeholder="Episode Number"
          name="number"
          register={register}
          error={errors.number}
          valueAsNumber
        />
        <FormField
          type="input"
          placeholder="Name"
          name="name"
          register={register}
          error={errors.name}
        />
        <FormField
          type="input"
          placeholder="Description"
          name="description"
          register={register}
          error={errors.description}
        />

        {!editingEpisode && (
          <FormFileInput
            register={register}
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
