import { GetAllArtistsDto } from "../schemas/artist";

const artistKeys = {
  all: () => ["artist"] as const,
  listsPrefix: () => [...artistKeys.all(), "list"] as const,
  list: (params: GetAllArtistsDto = {}) => [...artistKeys.listsPrefix(), params] as const,
  detailsPrefix: () => [...artistKeys.all(), "detail"] as const,
  detail: (id: string) => [...artistKeys.detailsPrefix(), id] as const,
  filmographiesPrefix: () => [...artistKeys.all(), "filmography"] as const,
  filmography: (id: string) => [...artistKeys.filmographiesPrefix(), id] as const,
};

export default artistKeys;
