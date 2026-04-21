import { useMutation, UseMutationOptions, useQueryClient } from "@tanstack/react-query";
import { CreateSeasonDto, Season } from "../schemas/season";
import SeasonService from "./season.service";

const prefix = "seasons";

export const useCreateSeason = (
  options?: Omit<UseMutationOptions<Season, Error, CreateSeasonDto>, "mutationFn">,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: (data: CreateSeasonDto) => SeasonService.create(data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: [prefix] });
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
  });
};

export const useUpdateSeason = (
  options?: Omit<
    UseMutationOptions<Season, Error, { id: string; payload: CreateSeasonDto }>,
    "mutationFn"
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: ({ id, payload }: { id: string; payload: CreateSeasonDto }) =>
      SeasonService.update(id, payload),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: [prefix] });
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
  });
};

export const useDeleteSeason = (
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: (id: string) => SeasonService.delete(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: [prefix] });
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
  });
};
