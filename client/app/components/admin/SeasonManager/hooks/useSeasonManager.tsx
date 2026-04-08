"use client";

import {
  createSeasonAction,
  deleteSeasonAction,
  updateSeasonAction,
} from "@/app/actions/season.actions";
import { CreateSeasonDto, Season, UpdateSeasonDto } from "@/app/types/season";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface UseSeasonManagerProps {
  titleId: string;
  seasons: Season[];
}

export const useSeasonManager = ({ titleId, seasons }: UseSeasonManagerProps) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSeasonDto>();

  const createMutation = useMutation({
    mutationFn: (data: CreateSeasonDto) => createSeasonAction({ ...data, titleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons", titleId] });
      setIsModalOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: UpdateSeasonDto }) =>
      updateSeasonAction(data.id, titleId, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons", titleId] });
      setIsModalOpen(false);
      setEditingSeason(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSeasonAction(id, titleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons", titleId] });
      setIsDeleteModalOpen(false);
      setSeasonToDelete(null);
    },
  });

  const onSubmit = (data: CreateSeasonDto) => {
    if (editingSeason) {
      updateMutation.mutate({ id: editingSeason.id, payload: data });
    } else {
      createMutation.mutate(data);
    }
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
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (seasonToDelete) {
      deleteMutation.mutate(seasonToDelete.id);
    }
  };

  return {
    isModalOpen,
    setIsModalOpen,
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
    setIsDeleteModalOpen,
    seasonToDelete,
    openDelete,
    handleConfirmDelete,
  };
};
