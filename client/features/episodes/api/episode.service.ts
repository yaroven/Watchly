import api from "@/shared/api/axios";
import { parseApiDate } from "@/shared/lib/parse-api-date";
import axios from "axios";
import { CreateEpisodeDto, Episode, UpdateEpisodeDto } from "../schemas/episode";

const prefix = "episode";

interface ApiEpisode extends Omit<Episode, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

const mapEpisode = (episode: ApiEpisode): Episode => ({
  ...episode,
  createdAt: parseApiDate(episode.createdAt),
  updatedAt: parseApiDate(episode.updatedAt),
});

const EpisodeService = {
  getAll: async (seasonId: string): Promise<Episode[]> => {
    const { data } = await api.get<ApiEpisode[]>(`/${prefix}`, {
      params: {
        seasonId,
      },
    });
    return data.map(mapEpisode);
  },

  getById: async (id: string): Promise<Episode> => {
    const { data } = await api.get<ApiEpisode>(`/${prefix}/${id}`);
    return mapEpisode(data);
  },

  getStreamUrl: async (id: string): Promise<string> => {
    const { data } = await api.get<{ url: string }>(`/${prefix}/${id}/video`);
    return data.url;
  },
  create: async (episodeData: Omit<CreateEpisodeDto, "videoFile">): Promise<Episode> => {
    const { data } = await api.post<ApiEpisode>(`/${prefix}`, episodeData);
    return mapEpisode(data);
  },

  update: async (id: string, episodeData: UpdateEpisodeDto): Promise<Episode> => {
    const { data } = await api.patch<ApiEpisode>(`/${prefix}/${id}`, episodeData);
    return mapEpisode(data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/${prefix}/${id}`);
  },

  getUploadUrl: async (id: string): Promise<string> => {
    const { data } = await api.get<{ url: string }>(`/${prefix}/${id}/upload-url`);
    return data.url;
  },

  async uploadToS3(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
    await axios.put(url, file, {
      headers: {
        "Content-Type": file.type,
      },
      onUploadProgress: (progressEvent) => {
        const total = progressEvent.total || file.size;
        const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
        onProgress(percentCompleted);
      },
    });
  },
};

export default EpisodeService;
