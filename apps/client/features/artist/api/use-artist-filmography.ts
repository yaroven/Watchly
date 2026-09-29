import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { ArtistFilmographyItem } from "../schemas/artist";
import artistKeys from "./artist.keys";
import artistService from "./artist.service";

const useArtistFilmography = (
  id: string,
  options?: Omit<UseQueryOptions<ArtistFilmographyItem[], Error, ArtistFilmographyItem[], readonly unknown[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: artistKeys.filmography(id),
    queryFn: () => artistService.getFilmography(id),
    ...options,
  });
};

export default useArtistFilmography;
