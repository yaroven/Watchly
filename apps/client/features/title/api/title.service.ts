import { parseApiDate } from "@/shared/lib/parse-api-date";
import api from "@shared/api/axios";
import axios from "axios";
import { CreateTitleDto, GetAllTitlesDto, Title, UpdateTitleDto } from "../schemas/title";

const prefix = "title";

interface ApiTitle extends Omit<Title, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

const mapTitle = (title: ApiTitle): Title => ({
  ...title,
  createdAt: parseApiDate(title.createdAt),
  updatedAt: parseApiDate(title.updatedAt),
});

type TitleCreatePayload = CreateTitleDto;
type TitleUpdatePayload = UpdateTitleDto;

const TitleService = {
  createTitle: async (titleData: TitleCreatePayload): Promise<Title> => {
    const { data } = await api.post<ApiTitle>(`/${prefix}`, titleData);
    return mapTitle(data);
  },

  getAll: async ({ searchString = "", page = 1, limit = 10, type, transcodingStatus }: GetAllTitlesDto = {}): Promise<{
    items: Title[];
    totalCount: number;
  }> => {
    const { data } = await api.get<{ items: ApiTitle[]; totalCount: number }>(`/${prefix}`, {
      params: { search: searchString, page, limit, type, transcodingStatus },
    });
    return {
      ...data,
      items: data.items.map(mapTitle),
    };
  },

  getById: async (id: string): Promise<Title> => {
    const { data } = await api.get<ApiTitle>(`/${prefix}/${id}`);
    return mapTitle(data);
  },

  getStreamUrl: async (id: string): Promise<string> => {
    const { data } = await api.get<{ url: string }>(`/${prefix}/${id}/video`);
    return data.url;
  },

  getUploadUrl: async (id: string): Promise<string> => {
    const { data } = await api.get<{ url: string }>(`/${prefix}/${id}/upload-url`);
    return data.url;
  },

  getPosterUploadUrl: async (id: string): Promise<{ uploadUrl: string; posterUrl: string }> => {
    const { data } = await api.get<{ uploadUrl: string; posterUrl: string }>(`/${prefix}/${id}/poster-upload-url`);
    return data;
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

  update: async (id: string, titleData: TitleUpdatePayload): Promise<Title> => {
    const { data } = await api.patch<ApiTitle>(`/${prefix}/${id}`, titleData);
    return mapTitle(data);
  },

  transcode: async (id: string): Promise<void> => {
    await api.post(`/${prefix}/${id}/transcode`);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/${prefix}/${id}`);
  },
};

export default TitleService;
