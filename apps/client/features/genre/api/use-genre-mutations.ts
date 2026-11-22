import { catalogueCopies } from "@/features/title/api/catalogue-copies";
import createMutationHook from "@/shared/api/createMutationHook";
import { UseMutationOptions } from "@tanstack/react-query";
import { CreateGenreDto, Genre, UpdateGenreDto } from "../schemas/genre";
import genreService from "./genre.service";

export const useCreateGenre = (options?: Omit<UseMutationOptions<Genre, Error, CreateGenreDto>, "mutationFn">) => {
  const useCreateGenre = createMutationHook({
    mutationFn: (data: CreateGenreDto) => genreService.create(data),
    getInvalidateKeys: () => catalogueCopies.anyGenre(),
  });
  return useCreateGenre(options);
};

export const useUpdateGenre = (options?: Omit<UseMutationOptions<Genre, Error, { id: string; data: UpdateGenreDto }>, "mutationFn">) => {
  const useUpdateGenre = createMutationHook({
    mutationFn: ({ id, data }: { id: string; data: UpdateGenreDto }) => genreService.update(id, data),
    getInvalidateKeys: () => catalogueCopies.anyGenre(),
  });
  return useUpdateGenre(options);
};

export const useDeleteGenre = (options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">) => {
  const useDeleteGenre = createMutationHook({
    mutationFn: (id: string) => genreService.delete(id),
    getInvalidateKeys: () => catalogueCopies.anyGenre(),
  });
  return useDeleteGenre(options);
};
