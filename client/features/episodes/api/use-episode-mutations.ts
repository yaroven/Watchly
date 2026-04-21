import { useMutation, UseMutationOptions, useQueryClient } from "@tanstack/react-query";
import { CreateEpisodeDto, Episode } from "../schemas/episode";
import EpisodeService from "./episode.service";

const prefix = "episodes";

export const useCreateEpisode = (
  options?: Omit<UseMutationOptions<Episode, Error, CreateEpisodeDto>, "mutationFn">,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: (data: CreateEpisodeDto) => EpisodeService.create(data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: [prefix] });
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
  });
};

export const useUpdateEpisode = (
  options?: Omit<
    UseMutationOptions<Episode, Error, { id: string; payload: CreateEpisodeDto }>,
    "mutationFn"
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: ({ id, payload }: { id: string; payload: CreateEpisodeDto }) =>
      EpisodeService.update(id, payload),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: [prefix] });
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
  });
};

export const useDeleteEpisode = (
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: (id: string) => EpisodeService.delete(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: [prefix] });
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
  });
};
