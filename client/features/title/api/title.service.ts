import { normalizeStreamUrl } from "@/shared/lib/normalize-stream-url";
import api from "@shared/api/axios";
import axios from "axios";
import { CreateTitleDto, GetAllTitlesDto, Title, UpdateTitleDto } from "../schemas/title";

const prefix = "title";

const TitleService = {
  createTitle: async (titleData: Omit<CreateTitleDto, "videoFile">): Promise<Title> => {
    const { data } = await api.post<Title>(`/${prefix}`, titleData);
    return data;
  },

  getAll: async ({ searchString = "", page = 1, limit = 10, type }: GetAllTitlesDto = {}): Promise<{
    items: Title[];
    totalCount: number;
  }> => {
    const { data } = await api.get<{ items: Title[]; totalCount: number }>(`/${prefix}`, {
      params: { search: searchString, page, limit, type },
    });
    return data;
  },

  getById: async (id: string): Promise<Title> => {
    const { data } = await api.get<Title>(`/${prefix}/${id}`);
    return data;
  },

  getStreamUrl: async (id: string): Promise<string> => {
    const { data } = await api.get<{ url: string }>(`/${prefix}/${id}/video`);
    return data.url;
  },

  getUploadUrl: async (id: string): Promise<string> => {
    const { data } = await api.get<{ url: string }>(`/${prefix}/${id}/upload-url`);
    return data.url;
  },

  async uploadToS3(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
    const uploadUrl = normalizeStreamUrl(url);

    await axios.put(uploadUrl, file, {
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

  update: async (id: string, titleData: UpdateTitleDto): Promise<Title> => {
    const { data } = await api.patch<Title>(`/${prefix}/${id}`, titleData);
    return data;
  },

  transcode: async (id: string): Promise<void> => {
    await api.post(`/${prefix}/${id}/transcode`);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/${prefix}/${id}`);
  },
};

export default TitleService;
