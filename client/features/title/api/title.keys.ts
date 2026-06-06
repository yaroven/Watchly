import { GetAllTitlesDto } from "../schemas/title";

const titleKeys = {
  all: () => ["title"] as const,
  lists: () => [...titleKeys.all(), "list"] as const,
  list: (params: GetAllTitlesDto = {}) => [...titleKeys.lists(), params] as const,
  details: () => [...titleKeys.all(), "detail"] as const,
  detail: (id: string) => [...titleKeys.details(), id] as const,
  stream: (id: string) => [...titleKeys.detail(id), "stream-url"] as const,
};

export default titleKeys;
