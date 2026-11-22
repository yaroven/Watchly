import api from "@/shared/api/axios";
import { StartMultipartUpload } from "@/shared/api/upload-media";
import { parseApiDate } from "@/shared/lib/parse-api-date";
import { type ContentLocale, inLocale, type TranslationLocale } from "@shared/lib/content-locale";
import { CreateEpisodeDto, Episode, EpisodeTranslation, EpisodeTranslationInput, UpdateEpisodeDto } from "../schemas/episode";

const prefix = "episodes";

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
  getAll: async (seasonId: string, locale: ContentLocale): Promise<Episode[]> => {
    const { data } = await api.get<ApiEpisode[]>(`/${prefix}`, {
      params: { filter: [`seasonId:eq:${seasonId}`] },
      paramsSerializer: { indexes: null },
      ...inLocale(locale),
    });
    return data.map(mapEpisode);
  },

  getById: async (id: string, locale: ContentLocale): Promise<Episode> => {
    const { data } = await api.get<ApiEpisode>(`/${prefix}/${id}`, inLocale(locale));
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

  startUpload: async (id: string, fileSize: number): Promise<StartMultipartUpload> => {
    const { data } = await api.post<StartMultipartUpload>(`/${prefix}/${id}/upload-url`, { fileSize });
    return data;
  },

  completeUpload: async (id: string, uploadId: string, parts: { partNumber: number; eTag: string }[]): Promise<void> => {
    await api.post(`/${prefix}/${id}/upload-url/complete`, { uploadId, parts });
  },

  abortUpload: async (id: string, uploadId: string): Promise<void> => {
    await api.delete(`/${prefix}/${id}/upload-url/${uploadId}`);
  },

  getTranslations: async (id: string): Promise<EpisodeTranslation[]> => {
    const { data } = await api.get<EpisodeTranslation[]>(`/${prefix}/${id}/translations`);
    return data;
  },

  saveTranslation: async (id: string, locale: TranslationLocale, translation: EpisodeTranslationInput): Promise<EpisodeTranslation> => {
    const { data } = await api.put<EpisodeTranslation>(`/${prefix}/${id}/translations/${locale}`, translation);
    return data;
  },

  deleteTranslation: async (id: string, locale: TranslationLocale): Promise<void> => {
    await api.delete(`/${prefix}/${id}/translations/${locale}`);
  },
};

export default EpisodeService;
