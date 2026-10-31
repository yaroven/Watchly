import createMutationHook from "@/shared/api/createMutationHook";
import { uploadImageFile } from "@/shared/api/upload-media";
import { UseMutationOptions } from "@tanstack/react-query";
import { Artist, ArtistFormValues } from "../schemas/artist";
import artistKeys from "./artist.keys";
import artistService from "./artist.service";

type CreateArtistWithUploadOptions = Omit<UseMutationOptions<Artist, Error, ArtistFormValues>, "mutationFn"> & {
  onUploadProgress?: (progress: number) => void;
};
type UpdateArtistMutationArgs = { id: string; payload: ArtistFormValues };
type UpdateArtistMutationOptions = Omit<UseMutationOptions<Artist, Error, UpdateArtistMutationArgs>, "mutationFn"> & {
  onUploadProgress?: (progress: number) => void;
};

export const useCreateArtistWithUpload = (options?: CreateArtistWithUploadOptions) => {
  const useCreateArtistWithUpload = createMutationHook({
    mutationFn: async ({ photoFile, ...payload }: ArtistFormValues) => {
      let createdArtist: Artist | null = null;

      try {
        createdArtist = await artistService.create(payload);
        const artistId = createdArtist.id;
        await uploadImageFile({
          files: photoFile,
          getUploadUrl: (contentType) => artistService.getPhotoUploadUrl(artistId, contentType),
          uploadToUrl: artistService.uploadToS3,
          onProgress: options?.onUploadProgress,
        });

        return createdArtist;
      } catch (error) {
        if (createdArtist) {
          try {
            await artistService.delete(createdArtist.id);
          } catch (rollbackError) {
            console.error("Failed to rollback artist after upload error", rollbackError);
          }
        }

        throw error;
      }
    },
    getInvalidateKeys: () => [artistKeys.all()],
  });
  return useCreateArtistWithUpload(options);
};

export const useUpdateArtistWithUpload = (options?: UpdateArtistMutationOptions) => {
  const useUpdateArtistWithUpload = createMutationHook({
    mutationFn: async ({ id, payload }: UpdateArtistMutationArgs) => {
      const { name, photoFile } = payload;
      await uploadImageFile({
        files: photoFile,
        getUploadUrl: (contentType) => artistService.getPhotoUploadUrl(id, contentType),
        uploadToUrl: artistService.uploadToS3,
        onProgress: options?.onUploadProgress,
      });

      return artistService.update(id, { name });
    },
    getInvalidateKeys: ({ id }: UpdateArtistMutationArgs) => [artistKeys.all(), artistKeys.detail(id)],
  });
  return useUpdateArtistWithUpload(options);
};

export const useDeleteArtist = (options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">) => {
  const useDeleteArtist = createMutationHook({
    mutationFn: (id: string) => artistService.delete(id),
    getInvalidateKeys: () => [artistKeys.all()],
    getRemoveKeys: (id: string) => [artistKeys.detail(id)],
  });
  return useDeleteArtist(options);
};
