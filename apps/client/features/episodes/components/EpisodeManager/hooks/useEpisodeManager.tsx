"use client";

import { useDeleteEpisode } from "@/features/episodes/api/use-episode-mutations";
import {
  createCreateEpisodeFormSchema,
  CreateEpisodeFormValues,
  createUpdateEpisodeFormSchema,
  Episode,
} from "@/features/episodes/schemas/episode";
import { zodResolver } from "@hookform/resolvers/zod";
import { INLINE_ERROR } from "@shared/api/write-errors";
import { nextNumber } from "@shared/lib/numbering";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
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
  const t = useTranslations("episodes");
  const createSchema = useMemo(() => createCreateEpisodeFormSchema(t), [t]);
  const updateSchema = useMemo(() => createUpdateEpisodeFormSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateEpisodeFormValues>({
    resolver: zodResolver(editingEpisode ? updateSchema : createSchema) as Resolver<CreateEpisodeFormValues>,
    mode: "onBlur",
  });

  function closeEditor() {
    setIsModalOpen(false);
  }

  function clearEditor() {
    setEditingEpisode(null);
    reset({
      name: "",
      description: "",
      number: nextNumber(episodes),
    });
  }

  const { submit, uploadProgress, isUploading, createMutation, updateMutation } = useEpisodeSubmissionWorkflow({
    seasonId,
    editingEpisode,
    onCreateSuccess: closeEditor,
    onUpdateSuccess: closeEditor,
  });

  const deleteMutation = useDeleteEpisode({
    meta: INLINE_ERROR,
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

  const clearSaveErrors = () => {
    createMutation.reset();
    updateMutation.reset();
  };

  const openEdit = (episode: Episode) => {
    clearSaveErrors();
    setEditingEpisode(episode);
    reset({
      name: episode.name,
      description: episode.description,
      number: episode.number,
    });
    setIsModalOpen(true);
  };

  const openCreate = () => {
    clearSaveErrors();
    setEditingEpisode(null);
    reset({
      name: "",
      description: "",
      number: nextNumber(episodes),
    });
    setIsModalOpen(true);
  };

  const openDelete = (episode: Episode) => {
    deleteMutation.reset();
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
    clearEditor,
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
