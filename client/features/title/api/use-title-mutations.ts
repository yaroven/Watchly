import createMutationHook from "@/shared/api/createMutationHook";
import { updateEntityPoster, uploadSignedFile, withUploadedPosterUrl } from "@/shared/api/upload-media";
import { UseMutationOptions } from "@tanstack/react-query";
import { CreateTitleDto, Title, TitleFormValues, TitleType, UpdateTitleDto } from "../schemas/title";
import titleKeys from "./title.keys";
import titleService from "./title.service";

type CreateTitlePayload = CreateTitleDto;
type CreateTitleWithUploadPayload = TitleFormValues;
type UpdateTitleWithUploadPayload = TitleFormValues;
type CreateTitleWithUploadOptions = Omit<UseMutationOptions<Title, Error, CreateTitleWithUploadPayload>, "mutationFn"> & {
  onUploadProgress?: (progress: number) => void;
};

const getTitleUpdatePayload = ({ name, description, type }: UpdateTitleWithUploadPayload): UpdateTitleDto => ({
  name,
  description,
  type,
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
        createdTitle = await updateEntityPoster({
          entity: createdTitle,
          files: posterFile,
          getPosterUploadUrl: titleService.getPosterUploadUrl,
          uploadToUrl: titleService.uploadToS3,
          update: titleService.update,
          onProgress: options?.onUploadProgress,
        });

        if (payload.type === TitleType.MOVIE) {
          const titleId = createdTitle.id;
          await uploadSignedFile({
            files: videoFile,
            getUploadUrl: () => titleService.getUploadUrl(titleId),
            uploadToUrl: titleService.uploadToS3,
            onProgress: options?.onUploadProgress,
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

export const useUpdateTitle = (
  options?: Omit<UseMutationOptions<Title, Error, { id: string; payload: UpdateTitleWithUploadPayload }>, "mutationFn">,
) => {
  const useUpdateTitle = createMutationHook({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateTitleWithUploadPayload }) => {
      const { posterFile } = payload;
      const nextPayload = await withUploadedPosterUrl<UpdateTitleDto>({
        payload: getTitleUpdatePayload(payload),
        files: posterFile,
        getPosterUploadUrl: () => titleService.getPosterUploadUrl(id),
        uploadToUrl: titleService.uploadToS3,
      });

      return titleService.update(id, nextPayload);
    },
    getInvalidateKeys: ({ id }: { id: string }) => [titleKeys.all(), titleKeys.detail(id)],
  });
  return useUpdateTitle(options);
};

export const useDeleteTitle = (options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">) => {
  const useDeleteTitle = createMutationHook({
    mutationFn: (id: string) => titleService.delete(id),
    getInvalidateKeys: () => [titleKeys.all()],
    getRemoveKeys: (id: string) => [titleKeys.detail(id)],
  });
  return useDeleteTitle(options);
};

export const useTranscodeTitle = (options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">) => {
  const useTranscodeTitle = createMutationHook({
    mutationFn: (id: string) => titleService.transcode(id),
    getInvalidateKeys: (id: string) => [titleKeys.all(), titleKeys.detail(id), titleKeys.stream(id)],
  });
  return useTranscodeTitle(options);
};
