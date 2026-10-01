import type { ViewerKey } from "@shared/lib/use-viewer";
import { GetAllTitlesDto } from "../schemas/title";

/**
 * `listsPrefix`, `listPrefix`, `detailsPrefix` and `detailPrefix` are for
 * invalidation only — a title response carries the viewer's own engagement, so a
 * key without a viewer in it would share one cache entry between viewers. The
 * names say so, and `listFor`/`detailFor` require a `ViewerKey` that only
 * `useViewer` can mint.
 *
 * `stream` and `cast` deliberately hang off `all()` rather than the detail rung:
 * neither is viewer-dependent, and underneath `detail` every like and watchlist
 * toggle would invalidate the title's presigned playback URL and its cast list,
 * because invalidation matches by prefix.
 */
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
