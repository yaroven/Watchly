"use client";

import { EpisodeService } from "@/app/services/episode.service";
import { CreateEpisodeDto, Episode, UpdateEpisodeDto } from "@/app/types/episode";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface UseEpisodeManagerProps {
  titleId: string;
  seasonId: string;
  episodes: Episode[];
}

export const useEpisodeManager = ({ titleId, seasonId, episodes }: UseEpisodeManagerProps) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewStreamUrl, setPreviewStreamUrl] = useState<string | undefined>();
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewItemName, setPreviewItemName] = useState<string | undefined>();
  const [episodeToDelete, setEpisodeToDelete] = useState<Episode | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
      let uploadUrl = await EpisodeService.getUploadUrl(episode.id);

      if (uploadUrl.includes("localstack"))
        uploadUrl = uploadUrl.replace("localstack", "localhost");

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
      setIsModalOpen(false);
      reset();
      setUploadProgress(0);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ payload }: { id: string; payload: UpdateEpisodeDto }) => {
      await EpisodeService.update(titleId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episodes", seasonId] });
      setIsModalOpen(false);
      setEditingEpisode(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => EpisodeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episodes", seasonId] });
      setIsDeleteModalOpen(false);
      setEpisodeToDelete(null);
    },
  });

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
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!episodeToDelete) return;
    deleteMutation.mutate(episodeToDelete.id);
  };

  const handlePreview = async (episode: Episode) => {
    setPreviewItemName(`Episode ${episode.number}: ${episode.name}`);
    setPreviewStreamUrl(undefined);
    setIsPreviewLoading(true);
    setIsPreviewModalOpen(true);
    try {
      const url = await EpisodeService.getStreamUrl(episode.id);
      setPreviewStreamUrl(url);
    } catch (err) {
      console.error("Failed to fetch stream URL", err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const isUploading = uploadProgress > 0 && uploadProgress < 100;

  return {
    isModalOpen,
    setIsModalOpen,
    editingEpisode,
    uploadProgress,
    isPreviewModalOpen,
    setIsPreviewModalOpen,
    previewStreamUrl,
    isPreviewLoading,
    previewItemName,
    register,
    handleSubmit,
    errors,
    createMutation,
    updateMutation,
    deleteMutation,
    onSubmit,
    openEdit,
    openCreate,
    handlePreview,
    isUploading,
    episodeToDelete,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    openDelete,
    handleConfirmDelete,
  };
};
