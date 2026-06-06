"use client";

import FormButton from "@/shared/ui/FormButton";
import FormField from "@/shared/ui/FormField";
import FormFileInput from "@/shared/ui/FormFileInput";
import Modal from "@/shared/ui/Modal/Modal";
import { useWatch } from "react-hook-form";
import styles from "../../SeasonManager.module.scss";
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
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <h3>{editingSeason ? "Edit Season" : "Add Season"}</h3>
        <FormField
          label="Season Number"
          type="number"
          placeholder="Season Number"
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
        <FormButton type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending
            ? "Saving..."
            : editingSeason
              ? "Update"
              : "Create"}
        </FormButton>
      </form>
    </Modal>
  );
}
