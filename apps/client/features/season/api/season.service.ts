import { CreateSeasonDto, Season, SeasonTranslation, SeasonTranslationInput, UpdateSeasonDto } from "@/features/season/schemas/season";
import api from "@/shared/api/axios";
import { parseApiDate } from "@/shared/lib/parse-api-date";
import { type ContentLocale, inLocale, type TranslationLocale } from "@shared/lib/content-locale";

const prefix = "seasons";

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
  getAll: async (titleId: string, locale: ContentLocale): Promise<Season[]> => {
    const { data } = await api.get<ApiSeason[]>(`/${prefix}`, {
      params: { filter: [`titleId:eq:${titleId}`] },
      paramsSerializer: { indexes: null },
      ...inLocale(locale),
    });
    return data.map(mapSeason);
  },

  getById: async (id: string, locale: ContentLocale): Promise<Season> => {
    const { data } = await api.get<ApiSeason>(`/${prefix}/${id}`, inLocale(locale));

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

  getPosterUploadUrl: async (id: string, contentType: string): Promise<{ uploadUrl: string; rawKey: string }> => {
    const { data } = await api.post<{ uploadUrl: string; rawKey: string }>(`/${prefix}/${id}/poster/upload-url`, { contentType });
    return data;
  },

  completePosterUpload: async (id: string, rawKey: string): Promise<void> => {
    await api.post(`/${prefix}/${id}/poster/upload-url/complete`, { rawKey });
  },

  getTranslations: async (id: string): Promise<SeasonTranslation[]> => {
    const { data } = await api.get<SeasonTranslation[]>(`/${prefix}/${id}/translations`);
    return data;
  },

  saveTranslation: async (id: string, locale: TranslationLocale, translation: SeasonTranslationInput): Promise<SeasonTranslation> => {
    const { data } = await api.put<SeasonTranslation>(`/${prefix}/${id}/translations/${locale}`, translation);
    return data;
  },

  deleteTranslation: async (id: string, locale: TranslationLocale): Promise<void> => {
    await api.delete(`/${prefix}/${id}/translations/${locale}`);
  },
};

export default SeasonService;
