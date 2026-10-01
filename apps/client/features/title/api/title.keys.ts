import { GetAllTitlesDto } from "../schemas/title";

/**
 * `list` and `detail` are invalidation prefixes, not query keys — a title response
 * carries the viewer's own engagement, so anything reading one must key by
 * `listFor`/`detailFor` or two viewers share a cache entry.
 *
 * `stream` and `cast` deliberately hang off `all()` rather than `detail(id)`:
 * neither is viewer-dependent, and under `detail` every like and watchlist toggle
 * would invalidate the title's presigned playback URL and its cast list, because
 * invalidation matches by prefix.
 */
const titleKeys = {
  all: () => ["title"] as const,
  lists: () => [...titleKeys.all(), "list"] as const,
  list: (params: GetAllTitlesDto = {}) => [...titleKeys.lists(), params] as const,
  details: () => [...titleKeys.all(), "detail"] as const,
  detail: (id: string) => [...titleKeys.details(), id] as const,
  listFor: (params: GetAllTitlesDto = {}, viewerKey: string) => [...titleKeys.list(params), { viewerKey }] as const,
  detailFor: (id: string, viewerKey: string) => [...titleKeys.detail(id), { viewerKey }] as const,
  stream: (id: string) => [...titleKeys.all(), "stream-url", id] as const,
  cast: (id: string) => [...titleKeys.all(), "cast", id] as const,
};

export default titleKeys;
