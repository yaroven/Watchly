import { GetAllTitlesDto } from "../schemas/title";

const titleKeys = {
  all: () => ["title"] as const,
  lists: () => [...titleKeys.all(), "list"] as const,
  list: (params: GetAllTitlesDto = {}) => [...titleKeys.lists(), params] as const,
  details: () => [...titleKeys.all(), "detail"] as const,
  detail: (id: string) => [...titleKeys.details(), id] as const,
  // The response carries the viewer's own engagement, so identity is part of the
  // key. Appended last, so invalidating by `list`/`detail` still matches by prefix.
  listFor: (params: GetAllTitlesDto = {}, viewerKey: string) => [...titleKeys.list(params), { viewerKey }] as const,
  detailFor: (id: string, viewerKey: string) => [...titleKeys.detail(id), { viewerKey }] as const,
  stream: (id: string) => [...titleKeys.detail(id), "stream-url"] as const,
  cast: (id: string) => [...titleKeys.detail(id), "cast"] as const,
};

export default titleKeys;
