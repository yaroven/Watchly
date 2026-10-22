import createMutationHook from "@/shared/api/createMutationHook";
import { forViewer } from "@/shared/api/viewer-cache";
import { useViewer } from "@/shared/lib/use-viewer";
import { useMutation, UseMutationOptions, useQueryClient } from "@tanstack/react-query";
import { Comment, CommentReaction, CreateCommentDto, ReactionType } from "../schemas/comment";
import commentKeys from "./comment.keys";
import commentService, { CommentPage } from "./comment.service";

interface InfiniteComments {
  pages: CommentPage[];
  pageParams: unknown[];
}

const applyReaction = (comment: Comment, commentId: string, result: CommentReaction): Comment => {
  if (comment.id === commentId) return { ...comment, ...result };
  if (comment.replies.length === 0) return comment;
  return { ...comment, replies: comment.replies.map((reply) => applyReaction(reply, commentId, result)) };
};

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

export const useReactToComment = (
  options?: Omit<UseMutationOptions<CommentReaction, Error, { commentId: string; type: ReactionType }>, "mutationFn">,
) => {
  const queryClient = useQueryClient();
  const { viewerKey } = useViewer();

  return useMutation({
    ...options,
    mutationFn: ({ commentId, type }: { commentId: string; type: ReactionType }) => commentService.react(commentId, type),
    onSuccess: (result, variables, onMutateResult, context) => {
      // Scoped to the acting viewer: `result` carries their own `myReaction`, and a
      // bare prefix would write it into every other viewer's cached entry as well.
      queryClient.setQueriesData<InfiniteComments>(forViewer(commentKeys.listsPrefix(), viewerKey), (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.map((item) => applyReaction(item, variables.commentId, result)),
              })),
            }
          : data,
      );

      queryClient.setQueriesData<CommentPage>(forViewer(commentKeys.repliesPrefix(), viewerKey), (data) =>
        data ? { ...data, items: data.items.map((item) => applyReaction(item, variables.commentId, result)) } : data,
      );

      options?.onSuccess?.(result, variables, onMutateResult, context);
    },
  });
};
