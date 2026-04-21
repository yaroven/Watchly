"use client";

import EpisodeService from "@/features/episodes/api/episode.service";
import { useDeleteEpisode, useUpdateEpisode } from "@/features/episodes/api/use-episode-mutations";
import { CreateEpisodeDto, Episode } from "@/features/episodes/schemas/episode";
import { normalizeStreamUrl } from "@/shared/lib/normalize-stream-url";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface UseEpisodeManagerProps {
  seasonId: string;
  episodes: Episode[];
}

export const useEpisodeManager = ({ seasonId, episodes }: UseEpisodeManagerProps) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [episodeToDelete, setEpisodeToDelete] = useState<Episode | null>(null);
  const [previewEpisode, setPreviewEpisode] = useState<Episode | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateEpisodeDto>();

  const createMutation = useMutation({
    mutationFn: async ({ videoFile, ...payload }: CreateEpisodeDto) => {
      const episode = await EpisodeService.create({ ...payload, seasonId });

      if (!videoFile || !videoFile[0]) return episode;

      const file = videoFile[0];
      const uploadUrl = normalizeStreamUrl(await EpisodeService.getUploadUrl(episode.id));

      await axios.put(uploadUrl, file, {
        headers: { "Content-Type": file.type },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || file.size;
          const percent = Math.round((progressEvent.loaded * 100) / total);
          setUploadProgress(percent);
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episodes", seasonId] });
      closeEditor();
      setUploadProgress(0);
    },
  });

  const updateMutation = useUpdateEpisode({
    onSuccess: () => {
      closeEditor();
    },
  });

  const deleteMutation = useDeleteEpisode({
    onSuccess: () => {
      closeDeleteModal();
    },
  });

  const closeEditor = () => {
    setIsModalOpen(false);
    setEditingEpisode(null);
    setUploadProgress(0);
    reset({
      name: "",
      description: "",
      number: episodes.length + 1,
    });
  };

  const closeDeleteModal = () => {
    setEpisodeToDelete(null);
  };

  const closePreviewModal = () => {
    setPreviewEpisode(null);
  };

  const onSubmit = (data: CreateEpisodeDto) => {
    if (editingEpisode) return updateMutation.mutate({ id: editingEpisode.id, payload: data });
    return createMutation.mutate(data);
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

  const isUploading = uploadProgress > 0 && uploadProgress < 100;
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
