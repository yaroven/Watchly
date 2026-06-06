import { CreateSeasonDto, Season, UpdateSeasonDto } from "@/features/season/schemas/season";
import api from "@/shared/api/axios";
import { parseApiDate } from "@/shared/lib/parse-api-date";
import axios from "axios";

const prefix = "season";

interface ApiSeason extends Omit<Season, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

const mapSeason = (season: ApiSeason): Season => ({
  ...season,
  createdAt: parseApiDate(season.createdAt),
  updatedAt: parseApiDate(season.updatedAt),
});

const SeasonService = {
  getAll: async (titleId: string): Promise<Season[]> => {
    const { data } = await api.get<ApiSeason[]>(`/${prefix}`, {
      params: {
        titleId,
      },
    });
    return data.map(mapSeason);
  },

  getById: async (id: string): Promise<Season> => {
    const { data } = await api.get<ApiSeason>(`/${prefix}/${id}`);

    return mapSeason(data);
  },
  create: async (seasonData: CreateSeasonDto): Promise<Season> => {
    const { data } = await api.post<ApiSeason>(`/${prefix}`, seasonData);
    return mapSeason(data);
  },

  update: async (id: string, seasonData: UpdateSeasonDto): Promise<Season> => {
    const { data } = await api.patch<ApiSeason>(`/${prefix}/${id}`, seasonData);
    return mapSeason(data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/${prefix}/${id}`);
  },

  getPosterUploadUrl: async (id: string): Promise<{ uploadUrl: string; posterUrl: string }> => {
    const { data } = await api.get<{ uploadUrl: string; posterUrl: string }>(`/${prefix}/${id}/poster-upload-url`);
    return data;
  },

  async uploadToS3(url: string, file: File, onProgress?: (percent: number) => void): Promise<void> {
    await axios.put(url, file, {
      headers: {
        "Content-Type": file.type,
      },
      onUploadProgress: (progressEvent) => {
        if (!onProgress) return;

        const total = progressEvent.total || file.size;
        const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
        onProgress(percentCompleted);
      },
    });
  },
};

export default SeasonService;
