import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import commentKeys from "./comment.keys";
import commentService, { CommentPage } from "./comment.service";

const useCommentReplies = (
  commentId: string,
  options?: Omit<UseQueryOptions<CommentPage, Error, CommentPage, readonly unknown[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: commentKeys.reply(commentId),
    queryFn: () => commentService.getReplies(commentId),
    ...options,
  });
};

export default useCommentReplies;
