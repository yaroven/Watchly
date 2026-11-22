import { catalogueCopies, ownedBy } from "@/features/title/api/catalogue-copies";
import createMutationHook from "@/shared/api/createMutationHook";
import { createWithMedia, imageAsset, updateWithMedia } from "@/shared/api/media-backed-write";
import { useUploadProgress, withUploadProgress } from "@/shared/api/use-upload-progress";
import { BASE_CONTENT_LOCALE } from "@shared/lib/content-locale";
import { UseMutationOptions } from "@tanstack/react-query";
import { CreateSeasonDto, Season, SeasonFormValues } from "../schemas/season";
import SeasonService from "./season.service";

type CreateSeasonWithPosterPayload = SeasonFormValues & Pick<CreateSeasonDto, "titleId">;
type UpdateSeasonWithPosterPayload = SeasonFormValues & Pick<CreateSeasonDto, "titleId">;

const seasonPoster = (id: string, files: FileList | undefined) =>
  imageAsset(files, {
    getUploadUrl: (contentType) => SeasonService.getPosterUploadUrl(id, contentType),
    completeUpload: (rawKey) => SeasonService.completePosterUpload(id, rawKey),
  });

export const useCreateSeason = (options?: Omit<UseMutationOptions<Season, Error, CreateSeasonWithPosterPayload>, "mutationFn">) => {
  const progress = useUploadProgress();
  const useCreateSeason = createMutationHook({
    mutationFn: ({ posterFile, ...payload }: CreateSeasonWithPosterPayload) =>
      createWithMedia({
        create: () => SeasonService.create(payload),
        assets: ({ id }) => [seasonPoster(id, posterFile)],
        remove: ({ id }) => SeasonService.delete(id),
        reload: ({ id }) => SeasonService.getById(id, BASE_CONTENT_LOCALE),
        onProgress: progress.report,
      }),
    getInvalidateKeys: () => catalogueCopies.anySeason(),
  });
  return withUploadProgress(useCreateSeason(options), progress);
};

export const useUpdateSeason = (
  options?: Omit<UseMutationOptions<Season, Error, { id: string; payload: UpdateSeasonWithPosterPayload }>, "mutationFn">,
) => {
  const progress = useUploadProgress();
  const useUpdateSeason = createMutationHook({
    mutationFn: ({ id, payload: { posterFile, ...seasonPayload } }: { id: string; payload: UpdateSeasonWithPosterPayload }) =>
      updateWithMedia({
        update: () => SeasonService.update(id, seasonPayload),
        assets: () => [seasonPoster(id, posterFile)],
        reload: () => SeasonService.getById(id, BASE_CONTENT_LOCALE),
        onProgress: progress.report,
      }),
    getInvalidateKeys: ({ id }: { id: string }) => catalogueCopies.season(id),
  });
  return withUploadProgress(useUpdateSeason(options), progress);
};

export const useDeleteSeason = (options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">) => {
  const useDeleteSeason = createMutationHook({
    mutationFn: (id: string) => SeasonService.delete(id),
    getInvalidateKeys: () => catalogueCopies.anySeason(),
    getRemoveKeys: (id: string) => ownedBy.season(id),
  });
  return useDeleteSeason(options);
};
