import createMutationHook from "@/shared/api/createMutationHook";
import { createWithMedia, imageAsset, multipartAsset, updateWithMedia } from "@/shared/api/media-backed-write";
import { useUploadProgress, withUploadProgress } from "@/shared/api/use-upload-progress";
import { BASE_CONTENT_LOCALE } from "@shared/lib/content-locale";
import { UseMutationOptions } from "@tanstack/react-query";
import {
  CastCredit,
  CastCreditInput,
  CreateTitleDto,
  ExternalRating,
  Title,
  TitleFormValues,
  TitleType,
  UpdateTitleDto,
} from "../schemas/title";
import { catalogueCopies, ownedBy } from "./catalogue-copies";
import titleService, { SyncAllRatingsResult } from "./title.service";

type CreateTitlePayload = CreateTitleDto;
type CreateTitleWithUploadPayload = TitleFormValues;
type UpdateTitleWithUploadPayload = TitleFormValues;
type CreateTitleWithUploadOptions = Omit<UseMutationOptions<Title, Error, CreateTitleWithUploadPayload>, "mutationFn"> & {
  onUploadPartProgress?: (completedParts: number, totalParts: number) => void;
};
type UpdateTitleMutationArgs = { id: string; payload: UpdateTitleWithUploadPayload };

const getTitleUpdatePayload = ({
  name,
  description,
  type,
  ageRating,
  country,
  releaseDate,
  language,
  trailerUrl,
  runtime,
  network,
  director,
  closedCaption,
  genreIds,
}: UpdateTitleWithUploadPayload): UpdateTitleDto => ({
  name,
  description,
  type,
  ageRating,
  country,
  releaseDate,
  language,
  trailerUrl,
  runtime,
  network,
  director,
  closedCaption,
  genreIds,
});

export const useCreateTitle = (options?: Omit<UseMutationOptions<Title, Error, CreateTitlePayload>, "mutationFn">) => {
  const useCreateTitle = createMutationHook({
    mutationFn: (titleData: CreateTitlePayload) => titleService.createTitle(titleData),
    getInvalidateKeys: () => catalogueCopies.anyTitle(),
  });
  return useCreateTitle(options);
};

export const useCreateTitleWithUpload = (options?: CreateTitleWithUploadOptions) => {
  const progress = useUploadProgress();
  const useCreateTitleWithUpload = createMutationHook({
    mutationFn: ({ videoFile, posterFile, ...payload }: CreateTitleWithUploadPayload) =>
      createWithMedia({
        create: () => titleService.createTitle(payload),
        assets: ({ id }) => [
          imageAsset(posterFile, {
            getUploadUrl: (contentType) => titleService.getPosterUploadUrl(id, contentType),
            completeUpload: (rawKey) => titleService.completePosterUpload(id, rawKey),
          }),
          payload.type === TitleType.MOVIE
            ? multipartAsset(videoFile, {
                startUpload: (fileSize) => titleService.startUpload(id, fileSize),
                completeUpload: (uploadId, parts) => titleService.completeUpload(id, uploadId, parts),
                abortUpload: (uploadId) => titleService.abortUpload(id, uploadId),
                onPartProgress: options?.onUploadPartProgress,
              })
            : null,
        ],
        remove: ({ id }) => titleService.delete(id),
        reload: ({ id }) => titleService.getById(id, BASE_CONTENT_LOCALE),
        onProgress: progress.report,
      }),
    getInvalidateKeys: () => catalogueCopies.anyTitle(),
  });
  return withUploadProgress(useCreateTitleWithUpload(options), progress);
};

export const useUpdateTitle = (options?: Omit<UseMutationOptions<Title, Error, UpdateTitleMutationArgs>, "mutationFn">) => {
  const progress = useUploadProgress();
  const useUpdateTitle = createMutationHook({
    mutationFn: ({ id, payload }: UpdateTitleMutationArgs) =>
      updateWithMedia({
        update: () => titleService.update(id, getTitleUpdatePayload(payload)),
        assets: () => [
          imageAsset(payload.posterFile, {
            getUploadUrl: (contentType) => titleService.getPosterUploadUrl(id, contentType),
            completeUpload: (rawKey) => titleService.completePosterUpload(id, rawKey),
          }),
        ],
        reload: () => titleService.getById(id, BASE_CONTENT_LOCALE),
        onProgress: progress.report,
      }),
    getInvalidateKeys: ({ id }: UpdateTitleMutationArgs) => catalogueCopies.title(id),
  });
  return withUploadProgress(useUpdateTitle(options), progress);
};

export const useDeleteTitle = (options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">) => {
  const useDeleteTitle = createMutationHook({
    mutationFn: (id: string) => titleService.delete(id),
    getInvalidateKeys: () => catalogueCopies.anyTitle(),
    getRemoveKeys: (id: string) => ownedBy.title(id),
  });
  return useDeleteTitle(options);
};

export const useTranscodeTitle = (options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">) => {
  const useTranscodeTitle = createMutationHook({
    mutationFn: (id: string) => titleService.transcode(id),
    getInvalidateKeys: (id: string) => [...catalogueCopies.title(id), ...catalogueCopies.titleStream(id)],
  });
  return useTranscodeTitle(options);
};

export const useSyncTitleRatings = (options?: Omit<UseMutationOptions<ExternalRating[], Error, string>, "mutationFn">) => {
  const useSyncTitleRatings = createMutationHook({
    mutationFn: (id: string) => titleService.syncRatings(id),
    getInvalidateKeys: (id: string) => catalogueCopies.title(id),
  });
  return useSyncTitleRatings(options);
};

export const useSyncAllRatings = (options?: Omit<UseMutationOptions<SyncAllRatingsResult, Error, void>, "mutationFn">) => {
  const useSyncAllRatings = createMutationHook<SyncAllRatingsResult, void>({
    mutationFn: () => titleService.syncAllRatings(),
    getInvalidateKeys: () => catalogueCopies.anyTitle(),
  });
  return useSyncAllRatings(options);
};

export const useSetTitleCast = (
  options?: Omit<UseMutationOptions<CastCredit[], Error, { id: string; credits: CastCreditInput[] }>, "mutationFn">,
) => {
  const useSetTitleCast = createMutationHook({
    mutationFn: ({ id, credits }: { id: string; credits: CastCreditInput[] }) => titleService.setCast(id, credits),
    getInvalidateKeys: ({ id }: { id: string; credits: CastCreditInput[] }) => catalogueCopies.titleCast(id),
  });
  return useSetTitleCast(options);
};
