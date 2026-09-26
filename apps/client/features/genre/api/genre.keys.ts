import { GetAllGenresDto } from "../schemas/genre";

const genreKeys = {
  all: () => ["genre"] as const,
  lists: () => [...genreKeys.all(), "list"] as const,
  list: (params: GetAllGenresDto = {}) => [...genreKeys.lists(), params] as const,
};

export default genreKeys;
