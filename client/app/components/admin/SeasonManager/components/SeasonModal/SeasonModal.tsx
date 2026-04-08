"use client";

import FormButton from "@/app/components/admin/FormButton";
import FormField from "@/app/components/admin/FormField";
import Modal from "@/app/components/shared/Modal/Modal";
import styles from "../../SeasonManager.module.scss";
import { useSeasonManagerContext } from "../../context/SeasonManagerContext";

export default function SeasonModal() {
  const {
    isModalOpen,
    setIsModalOpen,
    editingSeason,
    register,
    handleSubmit,
    errors,
    createMutation,
    updateMutation,
    onSubmit,
  } = useSeasonManagerContext();

  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <h3>{editingSeason ? "Edit Season" : "Add Season"}</h3>
        <FormField
          type="number"
          placeholder="Season Number"
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
        <FormField
          type="input"
          placeholder="Poster URL"
          name="posterUrl"
          register={register}
          error={errors.posterUrl}
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
