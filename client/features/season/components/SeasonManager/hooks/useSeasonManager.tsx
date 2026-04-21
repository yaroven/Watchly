"use client";

import {
  useCreateSeason,
  useDeleteSeason,
  useUpdateSeason,
} from "@/features/season/api/use-season-mutations";
import { CreateSeasonDto, Season } from "@/features/season/schemas/season";
import { useState } from "react";
import { useForm } from "react-hook-form";

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
    reset,
    formState: { errors },
  } = useForm<CreateSeasonDto>();

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
      posterUrl: "",
    });
  };

  const closeDeleteModal = () => {
    setSeasonToDelete(null);
  };

  const onSubmit = (data: CreateSeasonDto) => {
    const payload = { ...data, titleId };

    if (editingSeason) return updateMutation.mutate({ id: editingSeason.id, payload });
    return createMutation.mutate(payload);
  };

  const openEdit = (season: Season) => {
    setEditingSeason(season);
    reset({
      name: season.name,
      description: season.description,
      number: season.number,
      posterUrl: season.posterUrl,
    });
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setEditingSeason(null);
    reset({
      name: "",
      description: "",
      number: seasons.length + 1,
      posterUrl: "",
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
