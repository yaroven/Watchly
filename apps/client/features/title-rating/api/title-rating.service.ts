import api from "@shared/api/axios";
import { TitleRatingSummary } from "../schemas/title-rating";

const TitleRatingService = {
  get: async (titleId: string): Promise<TitleRatingSummary> => {
    const { data } = await api.get<TitleRatingSummary>(`/title/${titleId}/rating`);
    return data;
  },

  set: async (titleId: string, score: number): Promise<TitleRatingSummary> => {
    const { data } = await api.put<TitleRatingSummary>(`/title/${titleId}/rating`, { score });
    return data;
  },

  remove: async (titleId: string): Promise<TitleRatingSummary> => {
    const { data } = await api.delete<TitleRatingSummary>(`/title/${titleId}/rating`);
    return data;
  },
};

export default TitleRatingService;
