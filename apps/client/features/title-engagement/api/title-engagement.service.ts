import { type ApiTitle, mapTitle } from "@/features/title/api/title.service";
import type { Title } from "@/features/title/schemas/title";
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

  react: async (titleId: string, type: ReactionType): Promise<ReactionResult> => {
    const { data } = await api.post<ReactionResult>(`/reactions/titles/${titleId}`, { type });
    return data;
  },

  removeReaction: async (titleId: string): Promise<ReactionResult> => {
    const { data } = await api.delete<ReactionResult>(`/reactions/titles/${titleId}`);
    return data;
  },

  addToWatchlist: async (titleId: string): Promise<TitleEngagement> => {
    const { data } = await api.post<TitleEngagement>(`/titles/${titleId}/watchlist`);
    return data;
  },

  removeFromWatchlist: async (titleId: string): Promise<TitleEngagement> => {
    const { data } = await api.delete<TitleEngagement>(`/titles/${titleId}/watchlist`);
    return data;
  },

  getWatchlist: async (params: { page?: number; limit?: number } = {}): Promise<{ items: Title[]; totalCount: number }> => {
    const { data } = await api.get<{ items: ApiTitle[]; totalCount: number }>("/watchlist", { params });
    // Same normalisation as every other title read — without it these carry ISO
    // strings typed as `Date`, and the first component to format one throws.
    return { items: data.items.map(mapTitle), totalCount: data.totalCount };
  },
};

export default TitleEngagementService;
