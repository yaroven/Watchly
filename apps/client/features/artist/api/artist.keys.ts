import { GetAllArtistsDto } from "../schemas/artist";

const artistKeys = {
  all: () => ["artist"] as const,
  lists: () => [...artistKeys.all(), "list"] as const,
  list: (params: GetAllArtistsDto = {}) => [...artistKeys.lists(), params] as const,
  details: () => [...artistKeys.all(), "detail"] as const,
  detail: (id: string) => [...artistKeys.details(), id] as const,
  filmography: (id: string) => [...artistKeys.detail(id), "filmography"] as const,
};

export default artistKeys;
