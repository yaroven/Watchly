import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Artist, GetAllArtistsDto } from "../schemas/artist";
import artistKeys from "./artist.keys";
import artistService from "./artist.service";

export const useArtists = (
  params: GetAllArtistsDto = {},
  options?: Omit<
    UseQueryOptions<{ items: Artist[]; totalCount: number }, Error, { items: Artist[]; totalCount: number }, readonly unknown[]>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: artistKeys.list(params),
    queryFn: () => artistService.getAll(params),
    ...options,
  });
};

export const useArtist = (
  id: string,
  options?: Omit<UseQueryOptions<Artist, Error, Artist, readonly unknown[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: artistKeys.detail(id),
    queryFn: () => artistService.getById(id),
    ...options,
  });
};

export default useArtists;
