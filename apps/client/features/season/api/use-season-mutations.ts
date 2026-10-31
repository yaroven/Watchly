import createMutationHook from "@/shared/api/createMutationHook";
import { uploadImageFile } from "@/shared/api/upload-media";
import { UseMutationOptions } from "@tanstack/react-query";
import { CreateSeasonDto, Season, SeasonFormValues } from "../schemas/season";
import seasonKeys from "./season.keys";
import SeasonService from "./season.service";

type CreateSeasonWithPosterPayload = SeasonFormValues & Pick<CreateSeasonDto, "titleId">;
type UpdateSeasonWithPosterPayload = SeasonFormValues & Pick<CreateSeasonDto, "titleId">;

export const useCreateSeason = (options?: Omit<UseMutationOptions<Season, Error, CreateSeasonWithPosterPayload>, "mutationFn">) => {
  const useCreateSeason = createMutationHook({
    mutationFn: async ({ posterFile, ...payload }: CreateSeasonWithPosterPayload) => {
      const season = await SeasonService.create(payload);
      await uploadImageFile({
        files: posterFile,
        getUploadUrl: (contentType) => SeasonService.getPosterUploadUrl(season.id, contentType),
        uploadToUrl: SeasonService.uploadToS3,
      });

      return season;
    },
    getInvalidateKeys: () => [seasonKeys.all()],
  });
  return useCreateSeason(options);
};

export const useUpdateSeason = (
  options?: Omit<UseMutationOptions<Season, Error, { id: string; payload: UpdateSeasonWithPosterPayload }>, "mutationFn">,
) => {
  const useUpdateSeason = createMutationHook({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateSeasonWithPosterPayload }) => {
      const { posterFile, ...seasonPayload } = payload;
      await uploadImageFile({
        files: posterFile,
        getUploadUrl: (contentType) => SeasonService.getPosterUploadUrl(id, contentType),
        uploadToUrl: SeasonService.uploadToS3,
      });

      return SeasonService.update(id, seasonPayload);
    },
    getInvalidateKeys: ({ id }: { id: string }) => [seasonKeys.all(), seasonKeys.detail(id)],
  });
  return useUpdateSeason(options);
};

export const useDeleteSeason = (options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">) => {
  const useDeleteSeason = createMutationHook({
    mutationFn: (id: string) => SeasonService.delete(id),
    getInvalidateKeys: () => [seasonKeys.all()],
    getRemoveKeys: (id: string) => [seasonKeys.detail(id)],
  });
  return useDeleteSeason(options);
};
