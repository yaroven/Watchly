import createMutationHook from "@/shared/api/createMutationHook";
import { uploadSignedFile } from "@/shared/api/upload-media";
import { UseMutationOptions } from "@tanstack/react-query";
import { CreateEpisodeDto, Episode, UpdateEpisodeDto } from "../schemas/episode";
import { episodeKeys } from "./episode.keys";
import EpisodeService from "./episode.service";

type CreateEpisodeWithUploadPayload = CreateEpisodeDto;
type CreateEpisodeWithUploadOptions = Omit<UseMutationOptions<Episode, Error, CreateEpisodeWithUploadPayload>, "mutationFn"> & {
  onUploadProgress?: (progress: number) => void;
};

export const useCreateEpisode = (options?: Omit<UseMutationOptions<Episode, Error, CreateEpisodeDto>, "mutationFn">) => {
  const useCreateEpisodeMutation = createMutationHook({
    mutationFn: (data: CreateEpisodeDto) => EpisodeService.create(data),
    getInvalidateKeys: () => [episodeKeys.all()],
  });
  return useCreateEpisodeMutation(options);
};

export const useUpdateEpisode = (
  options?: Omit<UseMutationOptions<Episode, Error, { id: string; payload: UpdateEpisodeDto }>, "mutationFn">,
) => {
  const useUpdateEpisodeMutation = createMutationHook({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEpisodeDto }) => EpisodeService.update(id, payload),
    getInvalidateKeys: ({ id }) => [episodeKeys.all(), episodeKeys.detail(id)],
  });
  return useUpdateEpisodeMutation(options);
};

export const useDeleteEpisode = (options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">) => {
  const useDeleteEpisodeMutation = createMutationHook({
    mutationFn: (id: string) => EpisodeService.delete(id),
    getRemoveKeys: (id) => [episodeKeys.detail(id)],
    getInvalidateKeys: () => [episodeKeys.all()],
  });
  return useDeleteEpisodeMutation(options);
};

export const useCreateEpisodeWithUpload = (options?: CreateEpisodeWithUploadOptions) => {
  const useCreateEpisodeWithUpload = createMutationHook({
    mutationFn: async ({ videoFile, ...payload }: CreateEpisodeWithUploadPayload) => {
      const episode = await EpisodeService.create(payload);
      await uploadSignedFile({
        files: videoFile,
        getUploadUrl: () => EpisodeService.getUploadUrl(episode.id),
        uploadToUrl: EpisodeService.uploadToS3,
        onProgress: options?.onUploadProgress,
      });

      return episode;
    },
    getInvalidateKeys: () => [episodeKeys.all()],
  });
  return useCreateEpisodeWithUpload(options);
};
