import { type ApiOf, mapTitle } from "@/features/title/api/title.service";
import type { CardTitle } from "@/features/title/schemas/title";
import api from "@shared/api/axios";
import { ReactionResult, ReactionType, TitleEngagement } from "../schemas/title-engagement";

const TitleEngagementService = {
  get: async (titleId: string): Promise<TitleEngagement> => {
    const { data } = await api.get<TitleEngagement>(`/titles/${titleId}/engagement`);
    return data;
  },

  rate: async (titleId: string, score: number): Promise<TitleEngagement> => {
    const { data } = await api.put<TitleEngagement>(`/titles/${titleId}/rating`, { score });
    return data;
  },

  removeRating: async (titleId: string): Promise<TitleEngagement> => {
    const { data } = await api.delete<TitleEngagement>(`/titles/${titleId}/rating`);
    return data;
  },

  setReaction: async (titleId: string, vote: ReactionType | null): Promise<ReactionResult> => {
    const { data } = vote
      ? await api.put<ReactionResult>(`/reactions/titles/${titleId}`, { type: vote })
      : await api.delete<ReactionResult>(`/reactions/titles/${titleId}`);
    return data;
  },

  addToWatchlist: async (titleId: string): Promise<TitleEngagement> => {
    const { data } = await api.post<TitleEngagement>(`/watchlist/${titleId}`);
    return data;
  },

  removeFromWatchlist: async (titleId: string): Promise<TitleEngagement> => {
    const { data } = await api.delete<TitleEngagement>(`/watchlist/${titleId}`);
    return data;
  },

  getWatchlist: async (params: { page?: number; limit?: number } = {}): Promise<{ items: CardTitle[]; totalCount: number }> => {
    const { data } = await api.get<{ items: ApiOf<CardTitle>[]; totalCount: number }>("/watchlist", { params });
    return { items: data.items.map((item) => mapTitle<CardTitle>(item)), totalCount: data.totalCount };
  },
};

export default TitleEngagementService;
