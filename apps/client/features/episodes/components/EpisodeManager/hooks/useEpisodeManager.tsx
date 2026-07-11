"use client";

import { useDeleteEpisode } from "@/features/episodes/api/use-episode-mutations";
import { CreateEpisodeFormSchema, CreateEpisodeFormValues, Episode, UpdateEpisodeFormSchema } from "@/features/episodes/schemas/episode";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import { useEpisodeSubmissionWorkflow } from "./useEpisodeSubmissionWorkflow";

interface UseEpisodeManagerProps {
  seasonId: string;
  episodes: Episode[];
}

export const useEpisodeManager = ({ seasonId, episodes }: UseEpisodeManagerProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [episodeToDelete, setEpisodeToDelete] = useState<Episode | null>(null);
  const [previewEpisode, setPreviewEpisode] = useState<Episode | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateEpisodeFormValues>({
    resolver: zodResolver(editingEpisode ? UpdateEpisodeFormSchema : CreateEpisodeFormSchema) as Resolver<CreateEpisodeFormValues>,
    mode: "onBlur",
  });

  function closeEditor() {
    setIsModalOpen(false);
    setEditingEpisode(null);
    reset({
      name: "",
      description: "",
      number: episodes.length + 1,
    });
  }

  const { submit, uploadProgress, isUploading, createMutation, updateMutation } = useEpisodeSubmissionWorkflow({
    seasonId,
    editingEpisode,
    onCreateSuccess: closeEditor,
    onUpdateSuccess: closeEditor,
  });

  const deleteMutation = useDeleteEpisode({
    onSuccess: () => {
      closeDeleteModal();
    },
  });

  const closeDeleteModal = () => {
    setEpisodeToDelete(null);
  };

  const closePreviewModal = () => {
    setPreviewEpisode(null);
  };

  const onSubmit = (data: CreateEpisodeFormValues) => {
    submit(data);
  };

  const openEdit = (episode: Episode) => {
    setEditingEpisode(episode);
    reset({
      name: episode.name,
      description: episode.description,
      number: episode.number,
    });
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setEditingEpisode(null);
    reset({
      name: "",
      description: "",
      number: episodes.length + 1,
    });
    setIsModalOpen(true);
  };

  const openDelete = (episode: Episode) => {
    setEpisodeToDelete(episode);
  };

  const handleConfirmDelete = () => {
    if (!episodeToDelete) return;
    deleteMutation.mutate(episodeToDelete.id);
  };

  const openPreview = (episode: Episode) => setPreviewEpisode(episode);

  const isDeleteModalOpen = episodeToDelete !== null;
  const isPreviewModalOpen = previewEpisode !== null;

  return {
    isModalOpen,
    closeEditor,
    editingEpisode,
    uploadProgress,
    isPreviewModalOpen,
    closePreviewModal,
    previewEpisode,
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
    openPreview,
    isUploading,
    episodeToDelete,
    isDeleteModalOpen,
    closeDeleteModal,
    openDelete,
    handleConfirmDelete,
  };
};
