import { useInfiniteQuery } from "@tanstack/react-query";
import { CommentSortMode } from "../schemas/comment";
import commentKeys from "./comment.keys";
import commentService, { CommentPage } from "./comment.service";

/**
 * `enabled` exists so callers can hold the request until the session is restored — the
 * response carries the viewer's own reaction, which comes back empty on an anonymous call.
 */
const useComments = (titleId: string, sort: CommentSortMode = "newest", limit = 10, enabled = true) => {
  return useInfiniteQuery({
    enabled,
    queryKey: commentKeys.list(titleId, sort, limit),
    queryFn: ({ pageParam }) => commentService.getForTitle(titleId, { page: pageParam, limit, sort }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: CommentPage, pages: CommentPage[]) => {
      const loaded = pages.reduce((count, page) => count + page.items.length, 0);
      return loaded < lastPage.totalCount ? pages.length + 1 : undefined;
    },
  });
};

export default useComments;
