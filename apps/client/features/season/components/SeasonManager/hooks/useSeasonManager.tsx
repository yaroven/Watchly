"use client";

import { useCreateSeason, useDeleteSeason, useUpdateSeason } from "@/features/season/api/use-season-mutations";
import { createSeasonFormSchema, Season, SeasonFormValues } from "@/features/season/schemas/season";
import { zodResolver } from "@hookform/resolvers/zod";
import { INLINE_ERROR } from "@shared/api/write-errors";
import { nextNumber } from "@shared/lib/numbering";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Resolver, useForm } from "react-hook-form";

interface UseSeasonManagerProps {
  seasons: Season[];
  titleId: string;
}

export const useSeasonManager = ({ seasons, titleId }: UseSeasonManagerProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);
  const t = useTranslations("season");
  const seasonFormSchema = useMemo(() => createSeasonFormSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SeasonFormValues>({
    resolver: zodResolver(seasonFormSchema) as Resolver<SeasonFormValues>,
    mode: "onBlur",
  });

  const createMutation = useCreateSeason({
    meta: INLINE_ERROR,
    onSuccess: () => {
      closeEditor();
    },
  });

  const updateMutation = useUpdateSeason({
    meta: INLINE_ERROR,
    onSuccess: () => {
      closeEditor();
    },
  });

  const deleteMutation = useDeleteSeason({
    meta: INLINE_ERROR,
    onSuccess: () => {
      closeDeleteModal();
    },
  });

  const closeEditor = () => {
    setIsModalOpen(false);
  };

  const clearEditor = () => {
    setEditingSeason(null);
    reset({
      name: "",
      description: "",
      number: nextNumber(seasons),
      posterFile: undefined,
    });
  };

  const closeDeleteModal = () => {
    setSeasonToDelete(null);
  };

  const onSubmit = (data: SeasonFormValues) => {
    const payload = {
      ...data,
      titleId,
    };

    if (editingSeason) return updateMutation.mutate({ id: editingSeason.id, payload });
    return createMutation.mutate(payload);
  };

  const clearSaveErrors = () => {
    createMutation.reset();
    updateMutation.reset();
  };

  const openEdit = (season: Season) => {
    clearSaveErrors();
    setEditingSeason(season);
    reset({
      name: season.name,
      description: season.description,
      number: season.number,
      posterFile: undefined,
    });
    setIsModalOpen(true);
  };

  const openCreate = () => {
    clearSaveErrors();
    setEditingSeason(null);
    reset({
      name: "",
      description: "",
      number: nextNumber(seasons),
      posterFile: undefined,
    });
    setIsModalOpen(true);
  };

  const openDelete = (season: Season) => {
    deleteMutation.reset();
    setSeasonToDelete(season);
  };

  const handleConfirmDelete = () => {
    if (!seasonToDelete) return;
    return deleteMutation.mutate(seasonToDelete.id);
  };

  const isDeleteModalOpen = seasonToDelete !== null;

  return {
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
    deleteMutation,
    onSubmit,
    openEdit,
    openCreate,
    isDeleteModalOpen,
    closeDeleteModal,
    seasonToDelete,
    openDelete,
    handleConfirmDelete,
  };
};
