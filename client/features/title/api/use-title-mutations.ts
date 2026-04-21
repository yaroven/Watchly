import { useMutation, UseMutationOptions, useQueryClient } from "@tanstack/react-query";
import { CreateTitleDto, Title } from "../schemas/title";
import titleService from "./title.service";

const prefix = "title";
type CreateTitlePayload = Omit<CreateTitleDto, "videoFile">;

export const useCreateTitle = (
  options?: Omit<UseMutationOptions<Title, Error, CreateTitlePayload>, "mutationFn">,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (titleData: CreateTitlePayload) => titleService.createTitle(titleData),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: [prefix] });
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
  });
};

export const useUpdateTitle = (
  options?: Omit<
    UseMutationOptions<Title, Error, { id: string; payload: CreateTitleDto }>,
    "mutationFn"
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: ({ id, payload }: { id: string; payload: CreateTitleDto }) =>
      titleService.update(id, payload),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: [prefix] });
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
  });
};

export const useDeleteTitle = (
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (id: string) => titleService.delete(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: [prefix] });
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
  });
};

export const useTranscodeTitle = (
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (id: string) => titleService.transcode(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: [prefix] });
      queryClient.invalidateQueries({ queryKey: [prefix, args[0]] });
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
  });
};
