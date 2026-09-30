import { parseApiDate } from "@/shared/lib/parse-api-date";
import api from "@shared/api/axios";
import { Comment, CommentReaction, CreateCommentDto, GetCommentsDto, ReactionType } from "../schemas/comment";

export interface CommentPage {
  items: Comment[];
  totalCount: number;
}

interface ApiComment extends Omit<Comment, "createdAt" | "replies"> {
  createdAt: string;
  replies?: ApiComment[];
}

const mapComment = (comment: ApiComment): Comment => ({
  ...comment,
  createdAt: parseApiDate(comment.createdAt),
  replies: (comment.replies ?? []).map(mapComment),
});

const CommentService = {
  getForTitle: async (titleId: string, { page = 1, limit = 10, sort = "newest" }: GetCommentsDto = {}): Promise<CommentPage> => {
    const { data } = await api.get<{ items: ApiComment[]; totalCount: number }>(`/title/${titleId}/comments`, {
      params: { page, limit, sort },
    });
    return { ...data, items: data.items.map(mapComment) };
  },

  getReplies: async (commentId: string, { page = 1, limit = 20 }: GetCommentsDto = {}): Promise<CommentPage> => {
    const { data } = await api.get<{ items: ApiComment[]; totalCount: number }>(`/comments/${commentId}/replies`, {
      params: { page, limit },
    });
    return { ...data, items: data.items.map(mapComment) };
  },

  create: async (titleId: string, payload: CreateCommentDto): Promise<Comment> => {
    const { data } = await api.post<ApiComment>(`/title/${titleId}/comments`, payload);
    return mapComment(data);
  },

  react: async (commentId: string, type: ReactionType): Promise<CommentReaction> => {
    const { data } = await api.post<CommentReaction>(`/comments/${commentId}/reactions`, { type });
    return data;
  },

  report: async (commentId: string, reason?: string): Promise<void> => {
    await api.post(`/comments/${commentId}/report`, { reason });
  },

  delete: async (commentId: string): Promise<void> => {
    await api.delete(`/comments/${commentId}`);
  },
};

export default CommentService;
