import { CreateSeasonDto, Season, UpdateSeasonDto } from "../types/season";
import api from "./axios";

const prefix = "season";

export const SeasonService = {
  getAll: async (titleId: string): Promise<Season[]> => {
    const { data } = await api.get<Season[]>(`/${prefix}`, {
      params: {
        titleId,
      },
    });
    return data;
  },

  getById: async (id: string): Promise<Season> => {
    const { data } = await api.get<Season>(`/${prefix}/${id}`);

    return data;
  },
  create: async (seasonData: CreateSeasonDto): Promise<Season> => {
    const { data } = await api.post<Season>(`/${prefix}`, seasonData);
    return data;
  },

  update: async (id: string, seasonData: UpdateSeasonDto): Promise<Season> => {
    const { data } = await api.put<Season>(`/${prefix}/${id}`, seasonData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/${prefix}/${id}`);
  },
};
