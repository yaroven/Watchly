import { CreateEpisodeDto, Episode, UpdateEpisodeDto } from "../types/episode";
import api from "./axios";

const prefix = "episode";

export const EpisodeService = {
  getAll: async (seasonId: string): Promise<Episode[]> => {
    const { data } = await api.get<Episode[]>(`/${prefix}`, {
      params: {
        seasonId,
      },
    });
    return data;
  },

  getById: async (id: string): Promise<Episode> => {
    const { data } = await api.get<Episode>(`/${prefix}/${id}`);
    return data;
  },

  getStreamUrl: async (id: string): Promise<string> => {
    const { data } = await api.get<{ url: string }>(`/${prefix}/${id}/video`);
    return data.url;
  },
  create: async (episodeData: Omit<CreateEpisodeDto, "videoFile">): Promise<Episode> => {
    const { data } = await api.post<Episode>(`/${prefix}`, episodeData);
    return data;
  },

  update: async (id: string, episodeData: UpdateEpisodeDto): Promise<Episode> => {
    const { data } = await api.put<Episode>(`/${prefix}/${id}`, episodeData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/${prefix}/${id}`);
  },

  getUploadUrl: async (id: string): Promise<string> => {
    const { data } = await api.get<{ url: string }>(`/${prefix}/${id}/upload-url`);
    return data.url;
  },
};
