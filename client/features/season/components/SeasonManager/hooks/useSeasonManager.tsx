"use client";

import {
  useCreateSeason,
  useDeleteSeason,
  useUpdateSeason,
} from "@/features/season/api/use-season-mutations";
import {
  Season,
  SeasonFormSchema,
  SeasonFormValues,
} from "@/features/season/schemas/season";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Resolver, useForm } from "react-hook-form";

interface UseSeasonManagerProps {
  seasons: Season[];
  titleId: string;
}

export const useSeasonManager = ({ seasons, titleId }: UseSeasonManagerProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SeasonFormValues>({
    resolver: zodResolver(SeasonFormSchema) as Resolver<SeasonFormValues>,
    mode: "onBlur",
  });

  const createMutation = useCreateSeason({
    onSuccess: () => {
      closeEditor();
    },
  });

  const updateMutation = useUpdateSeason({
    onSuccess: () => {
      closeEditor();
    },
  });

  const deleteMutation = useDeleteSeason({
    onSuccess: () => {
      closeDeleteModal();
    },
  });

  const closeEditor = () => {
    setIsModalOpen(false);
    setEditingSeason(null);
    reset({
      name: "",
      description: "",
      number: seasons.length + 1,
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

  const openEdit = (season: Season) => {
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
    setEditingSeason(null);
    reset({
      name: "",
      description: "",
      number: seasons.length + 1,
      posterFile: undefined,
    });
    setIsModalOpen(true);
  };

  const openDelete = (season: Season) => {
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
