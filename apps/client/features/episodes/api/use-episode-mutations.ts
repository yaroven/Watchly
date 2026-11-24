import { catalogueCopies, ownedBy } from "@/features/title/api/catalogue-copies";
import createMutationHook from "@/shared/api/createMutationHook";
import { createWithMedia, multipartAsset } from "@/shared/api/media-backed-write";
import { useUploadProgress, withUploadProgress } from "@/shared/api/use-upload-progress";
import { BASE_CONTENT_LOCALE } from "@shared/lib/content-locale";
import { UseMutationOptions } from "@tanstack/react-query";
import { CreateEpisodeDto, Episode, UpdateEpisodeDto } from "../schemas/episode";
import EpisodeService from "./episode.service";

type CreateEpisodeWithUploadPayload = CreateEpisodeDto;
type CreateEpisodeWithUploadOptions = Omit<UseMutationOptions<Episode, Error, CreateEpisodeWithUploadPayload>, "mutationFn"> & {};

export const useCreateEpisode = (options?: Omit<UseMutationOptions<Episode, Error, CreateEpisodeDto>, "mutationFn">) => {
  const useCreateEpisodeMutation = createMutationHook({
    mutationFn: (data: CreateEpisodeDto) => EpisodeService.create(data),
    getInvalidateKeys: () => catalogueCopies.anyEpisode(),
  });
  return useCreateEpisodeMutation(options);
};

export const useUpdateEpisode = (
  options?: Omit<UseMutationOptions<Episode, Error, { id: string; payload: UpdateEpisodeDto }>, "mutationFn">,
) => {
  const useUpdateEpisodeMutation = createMutationHook({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEpisodeDto }) => EpisodeService.update(id, payload),
    getInvalidateKeys: ({ id }) => catalogueCopies.episode(id),
  });
  return useUpdateEpisodeMutation(options);
};

export const useDeleteEpisode = (options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">) => {
  const useDeleteEpisodeMutation = createMutationHook({
    mutationFn: (id: string) => EpisodeService.delete(id),
    getRemoveKeys: (id) => ownedBy.episode(id),
    getInvalidateKeys: () => catalogueCopies.anyEpisode(),
  });
  return useDeleteEpisodeMutation(options);
};

export const useCreateEpisodeWithUpload = (options?: CreateEpisodeWithUploadOptions) => {
  const progress = useUploadProgress();
  const useCreateEpisodeWithUpload = createMutationHook({
    mutationFn: ({ videoFile, ...payload }: CreateEpisodeWithUploadPayload) =>
      createWithMedia({
        create: () => EpisodeService.create(payload),
        assets: ({ id }) => [
          multipartAsset(videoFile, {
            startUpload: (fileSize) => EpisodeService.startUpload(id, fileSize),
            completeUpload: (uploadId, parts) => EpisodeService.completeUpload(id, uploadId, parts),
            abortUpload: (uploadId) => EpisodeService.abortUpload(id, uploadId),
          }),
        ],
        remove: ({ id }) => EpisodeService.delete(id),
        reload: ({ id }) => EpisodeService.getById(id, BASE_CONTENT_LOCALE),
        onProgress: progress.report,
      }),
    getInvalidateKeys: () => catalogueCopies.anyEpisode(),
  });
  return withUploadProgress(useCreateEpisodeWithUpload(options), progress);
};
