import { catalogueCopies, ownedBy } from "@/features/title/api/catalogue-copies";
import createMutationHook from "@/shared/api/createMutationHook";
import { createWithMedia, imageAsset, updateWithMedia } from "@/shared/api/media-backed-write";
import { useUploadProgress, withUploadProgress } from "@/shared/api/use-upload-progress";
import { UseMutationOptions } from "@tanstack/react-query";
import { Artist, ArtistFormValues } from "../schemas/artist";
import artistService from "./artist.service";

type CreateArtistWithUploadOptions = Omit<UseMutationOptions<Artist, Error, ArtistFormValues>, "mutationFn"> & {};
type UpdateArtistMutationArgs = { id: string; payload: ArtistFormValues };
type UpdateArtistMutationOptions = Omit<UseMutationOptions<Artist, Error, UpdateArtistMutationArgs>, "mutationFn"> & {};

const artistPhoto = (id: string, files: FileList | null | undefined) =>
  imageAsset(files, {
    getUploadUrl: (contentType) => artistService.getPhotoUploadUrl(id, contentType),
    completeUpload: (rawKey) => artistService.completePhotoUpload(id, rawKey),
  });

export const useCreateArtistWithUpload = (options?: CreateArtistWithUploadOptions) => {
  const progress = useUploadProgress();
  const useCreateArtistWithUpload = createMutationHook({
    mutationFn: ({ photoFile, ...payload }: ArtistFormValues) =>
      createWithMedia({
        create: () => artistService.create(payload),
        assets: ({ id }) => [artistPhoto(id, photoFile)],
        remove: ({ id }) => artistService.delete(id),
        reload: ({ id }) => artistService.getById(id),
        onProgress: progress.report,
      }),
    getInvalidateKeys: () => catalogueCopies.anyArtist(),
  });
  return withUploadProgress(useCreateArtistWithUpload(options), progress);
};

export const useUpdateArtistWithUpload = (options?: UpdateArtistMutationOptions) => {
  const progress = useUploadProgress();
  const useUpdateArtistWithUpload = createMutationHook({
    mutationFn: ({ id, payload: { name, photoFile } }: UpdateArtistMutationArgs) =>
      updateWithMedia({
        update: () => artistService.update(id, { name }),
        assets: () => [artistPhoto(id, photoFile)],
        reload: () => artistService.getById(id),
        onProgress: progress.report,
      }),
    getInvalidateKeys: ({ id }: UpdateArtistMutationArgs) => catalogueCopies.artist(id),
  });
  return withUploadProgress(useUpdateArtistWithUpload(options), progress);
};

export const useDeleteArtist = (options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">) => {
  const useDeleteArtist = createMutationHook({
    mutationFn: (id: string) => artistService.delete(id),
    getInvalidateKeys: () => catalogueCopies.anyArtist(),
    getRemoveKeys: (id: string) => ownedBy.artist(id),
  });
  return useDeleteArtist(options);
};
