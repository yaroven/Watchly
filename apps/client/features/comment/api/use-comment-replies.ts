import { usePagedRead } from "@shared/api/paged-read";
import { useViewer } from "@shared/lib/use-viewer";
import commentKeys from "./comment.keys";
import commentService from "./comment.service";

export const REPLIES_PAGE_SIZE = 20;

const useCommentReplies = (commentId: string, { enabled = true }: { enabled?: boolean } = {}) => {
  const viewer = useViewer();

  return usePagedRead(
    (page) => ({
      queryKey: commentKeys.replyPage(commentId, page, viewer.viewerKey),
      queryFn: () => commentService.getReplies(commentId, { page, limit: REPLIES_PAGE_SIZE }),
    }),
    { enabled: viewer.status !== "pending" && enabled },
  );
};

export default useCommentReplies;
