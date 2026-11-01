import createMutationHook from "@/shared/api/createMutationHook";
import { forViewer } from "@/shared/api/viewer-cache";
import { useViewer } from "@/shared/lib/use-viewer";
import { useMutation, UseMutationOptions, useQueryClient } from "@tanstack/react-query";
import { Comment, CommentReaction, CreateCommentDto, ReactionType } from "../schemas/comment";
import { InfiniteComments, withReactionInList, withReactionInReplies } from "./comment-reaction.cache";
import commentKeys from "./comment.keys";
import commentService, { CommentPage } from "./comment.service";

export const useCreateComment = (titleId: string, options?: Omit<UseMutationOptions<Comment, Error, CreateCommentDto>, "mutationFn">) => {
  const useCreate = createMutationHook({
    mutationFn: (data: CreateCommentDto) => commentService.create(titleId, data),
    getInvalidateKeys: (data: CreateCommentDto) =>
      data.parentId
        ? [commentKeys.titleListsPrefix(titleId), commentKeys.replyPrefix(data.parentId)]
        : [commentKeys.titleListsPrefix(titleId)],
  });
  return useCreate(options);
};

export const useDeleteComment = (titleId: string, options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">) => {
  const useDelete = createMutationHook({
    mutationFn: (commentId: string) => commentService.delete(commentId),
    getInvalidateKeys: () => [commentKeys.titleListsPrefix(titleId), commentKeys.repliesPrefix()],
  });
  return useDelete(options);
};

export const useReportComment = (options?: Omit<UseMutationOptions<void, Error, { commentId: string; reason?: string }>, "mutationFn">) => {
  return useMutation({
    mutationFn: ({ commentId, reason }: { commentId: string; reason?: string }) => commentService.report(commentId, reason),
    ...options,
  });
};

export const useSetCommentReaction = (
  options?: Omit<UseMutationOptions<CommentReaction, Error, { commentId: string; type: ReactionType | null }>, "mutationFn">,
) => {
  const queryClient = useQueryClient();
  const { viewerKey } = useViewer();

  return useMutation({
    ...options,
    mutationFn: ({ commentId, type }: { commentId: string; type: ReactionType | null }) => commentService.setReaction(commentId, type),
    onSuccess: (result, variables, onMutateResult, context) => {
      queryClient.setQueriesData<InfiniteComments>(forViewer(commentKeys.listsPrefix(), viewerKey), (data) =>
        withReactionInList(data, variables.commentId, result),
      );
      queryClient.setQueriesData<CommentPage>(forViewer(commentKeys.repliesPrefix(), viewerKey), (data) =>
        withReactionInReplies(data, variables.commentId, result),
      );

      options?.onSuccess?.(result, variables, onMutateResult, context);
    },
  });
};
