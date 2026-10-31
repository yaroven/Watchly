import createMutationHook from "@/shared/api/createMutationHook";
import { uploadImageFile, uploadMultipartFile } from "@/shared/api/upload-media";
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
import titleKeys from "./title.keys";
import titleService, { SyncAllRatingsResult } from "./title.service";

type CreateTitlePayload = CreateTitleDto;
type CreateTitleWithUploadPayload = TitleFormValues;
type UpdateTitleWithUploadPayload = TitleFormValues;
type CreateTitleWithUploadOptions = Omit<UseMutationOptions<Title, Error, CreateTitleWithUploadPayload>, "mutationFn"> & {
  onUploadProgress?: (progress: number) => void;
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
    getInvalidateKeys: () => [titleKeys.all()],
  });
  return useCreateTitle(options);
};

export const useCreateTitleWithUpload = (options?: CreateTitleWithUploadOptions) => {
  const useCreateTitleWithUpload = createMutationHook({
    mutationFn: async ({ videoFile, posterFile, ...payload }: CreateTitleWithUploadPayload) => {
      let createdTitle: Title | null = null;

      try {
        createdTitle = await titleService.createTitle(payload);
        const titleId = createdTitle.id;
        await uploadImageFile({
          files: posterFile,
          getUploadUrl: (contentType) => titleService.getPosterUploadUrl(titleId, contentType),
          uploadToUrl: titleService.uploadToS3,
          onProgress: options?.onUploadProgress,
        });

        if (payload.type === TitleType.MOVIE) {
          await uploadMultipartFile({
            files: videoFile,
            startUpload: (fileSize) => titleService.startUpload(titleId, fileSize),
            completeUpload: (uploadId, parts) => titleService.completeUpload(titleId, uploadId, parts),
            abortUpload: (uploadId) => titleService.abortUpload(titleId, uploadId),
            uploadPartToUrl: titleService.uploadPartToS3,
            onProgress: options?.onUploadProgress,
            onPartProgress: options?.onUploadPartProgress,
          });
        }

        return createdTitle;
      } catch (error) {
        if (createdTitle) {
          try {
            await titleService.delete(createdTitle.id);
          } catch (rollbackError) {
            console.error("Failed to rollback title after upload error", rollbackError);
          }
        }

        throw error;
      }
    },
    getInvalidateKeys: () => [titleKeys.all()],
  });
  return useCreateTitleWithUpload(options);
};

export const useUpdateTitle = (options?: Omit<UseMutationOptions<Title, Error, UpdateTitleMutationArgs>, "mutationFn">) => {
  const useUpdateTitle = createMutationHook({
    mutationFn: async ({ id, payload }: UpdateTitleMutationArgs) => {
      await uploadImageFile({
        files: payload.posterFile,
        getUploadUrl: (contentType) => titleService.getPosterUploadUrl(id, contentType),
        uploadToUrl: titleService.uploadToS3,
      });

      return titleService.update(id, getTitleUpdatePayload(payload));
    },
    getInvalidateKeys: ({ id }: UpdateTitleMutationArgs) => [titleKeys.all(), titleKeys.detailPrefix(id)],
  });
  return useUpdateTitle(options);
};

export const useDeleteTitle = (options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">) => {
  const useDeleteTitle = createMutationHook({
    mutationFn: (id: string) => titleService.delete(id),
    getInvalidateKeys: () => [titleKeys.all()],
    // stream and cast hang off `all()` rather than `detail(id)`, so removing the
    // detail prefix no longer reaches them — name them.
    getRemoveKeys: (id: string) => [titleKeys.detailPrefix(id), titleKeys.stream(id), titleKeys.cast(id)],
  });
  return useDeleteTitle(options);
};

export const useTranscodeTitle = (options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">) => {
  const useTranscodeTitle = createMutationHook({
    mutationFn: (id: string) => titleService.transcode(id),
    getInvalidateKeys: (id: string) => [titleKeys.all(), titleKeys.detailPrefix(id), titleKeys.stream(id)],
  });
  return useTranscodeTitle(options);
};

export const useSyncTitleRatings = (options?: Omit<UseMutationOptions<ExternalRating[], Error, string>, "mutationFn">) => {
  const useSyncTitleRatings = createMutationHook({
    mutationFn: (id: string) => titleService.syncRatings(id),
    getInvalidateKeys: (id: string) => [titleKeys.detailPrefix(id)],
  });
  return useSyncTitleRatings(options);
};

export const useSyncAllRatings = (options?: Omit<UseMutationOptions<SyncAllRatingsResult, Error, void>, "mutationFn">) => {
  const useSyncAllRatings = createMutationHook<SyncAllRatingsResult, void>({
    mutationFn: () => titleService.syncAllRatings(),
    getInvalidateKeys: () => [titleKeys.all()],
  });
  return useSyncAllRatings(options);
};

export const useSetTitleCast = (
  options?: Omit<UseMutationOptions<CastCredit[], Error, { id: string; credits: CastCreditInput[] }>, "mutationFn">,
) => {
  const useSetTitleCast = createMutationHook({
    mutationFn: ({ id, credits }: { id: string; credits: CastCreditInput[] }) => titleService.setCast(id, credits),
    getInvalidateKeys: ({ id }: { id: string; credits: CastCreditInput[] }) => [titleKeys.cast(id)],
  });
  return useSetTitleCast(options);
};
