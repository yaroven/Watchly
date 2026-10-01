import { useViewer } from "@shared/lib/use-viewer";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import commentKeys from "./comment.keys";
import commentService, { CommentPage } from "./comment.service";

const useCommentReplies = (
  commentId: string,
  options?: Omit<UseQueryOptions<CommentPage, Error, CommentPage, readonly unknown[]>, "queryKey" | "queryFn">,
) => {
  // Replies carry the viewer's own reaction, so the key carries the viewer.
  const viewer = useViewer();

  return useQuery({
    queryKey: commentKeys.reply(commentId, viewer.viewerKey),
    queryFn: () => commentService.getReplies(commentId),
    ...options,
    enabled: viewer.status !== "pending" && (options?.enabled ?? true),
  });
};

export default useCommentReplies;
