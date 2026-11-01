import type { ViewerKey } from "@shared/lib/use-viewer";
import { GetAllTitlesDto } from "../schemas/title";

const titleKeys = {
  all: () => ["title"] as const,
  listsPrefix: () => [...titleKeys.all(), "list"] as const,
  listPrefix: (params: GetAllTitlesDto = {}) => [...titleKeys.listsPrefix(), params] as const,
  detailsPrefix: () => [...titleKeys.all(), "detail"] as const,
  detailPrefix: (id: string) => [...titleKeys.detailsPrefix(), id] as const,
  listFor: (params: GetAllTitlesDto = {}, viewerKey: ViewerKey) => [...titleKeys.listPrefix(params), { viewerKey }] as const,
  detailFor: (id: string, viewerKey: ViewerKey) => [...titleKeys.detailPrefix(id), { viewerKey }] as const,
  stream: (id: string) => [...titleKeys.all(), "stream-url", id] as const,
  cast: (id: string) => [...titleKeys.all(), "cast", id] as const,
};

export default titleKeys;
