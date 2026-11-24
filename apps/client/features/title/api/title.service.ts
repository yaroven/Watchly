import { StartMultipartUpload } from "@/shared/api/upload-media";
import { parseApiDate } from "@/shared/lib/parse-api-date";
import api from "@shared/api/axios";
import { type ContentLocale, inLocale, type TranslationLocale } from "@shared/lib/content-locale";
import {
  CardTitle,
  CastCredit,
  CastCreditInput,
  CreateTitleDto,
  ExternalRating,
  GetAllTitlesDto,
  Title,
  TitleTranslation,
  TitleTranslationInput,
  UpdateTitleDto,
} from "../schemas/title";

const prefix = "titles";

export type ApiOf<T extends CardTitle> = Omit<T, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type ApiTitle = ApiOf<Title>;

export const mapTitle = <T extends CardTitle = Title>(title: ApiOf<T>): T =>
  ({
    ...title,
    createdAt: parseApiDate(title.createdAt),
    updatedAt: parseApiDate(title.updatedAt),
  }) as T;

type TitleCreatePayload = CreateTitleDto;
type TitleUpdatePayload = UpdateTitleDto;

export interface SyncAllRatingsResult {
  total: number;
  synced: number;
}

const TitleService = {
  createTitle: async (titleData: TitleCreatePayload): Promise<Title> => {
    const { data } = await api.post<ApiTitle>(`/${prefix}`, titleData);
    return mapTitle(data);
  },

  getAll: async (
    { searchString = "", page = 1, limit = 10, type, transcodingStatus, director, network, genreId }: GetAllTitlesDto = {},
    locale: ContentLocale,
  ): Promise<{
    items: Title[];
    totalCount: number;
  }> => {
    const filter: string[] = [];
    if (searchString) filter.push(`name:like:${searchString}`);
    if (type) filter.push(`type:eq:${type}`);
    if (transcodingStatus) filter.push(`transcodingStatus:eq:${transcodingStatus}`);
    if (director) filter.push(`director:like:${director}`);
    if (network) filter.push(`network:like:${network}`);
    if (genreId) filter.push(`genres:eq:${genreId}`);

    const { data } = await api.get<{ items: ApiTitle[]; totalCount: number }>(`/${prefix}`, {
      params: { page, limit, filter: filter.length ? filter : undefined },
      paramsSerializer: { indexes: null },
      ...inLocale(locale),
    });
    return {
      ...data,
      items: data.items.map(mapTitle),
    };
  },

  getById: async (id: string, locale: ContentLocale): Promise<Title> => {
    const { data } = await api.get<ApiTitle>(`/${prefix}/${id}`, inLocale(locale));
    return mapTitle(data);
  },

  getStreamUrl: async (id: string): Promise<string> => {
    const { data } = await api.get<{ url: string }>(`/${prefix}/${id}/video`);
    return data.url;
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

  getPosterUploadUrl: async (id: string, contentType: string): Promise<{ uploadUrl: string; rawKey: string }> => {
    const { data } = await api.post<{ uploadUrl: string; rawKey: string }>(`/${prefix}/${id}/poster/upload-url`, { contentType });
    return data;
  },

  completePosterUpload: async (id: string, rawKey: string): Promise<void> => {
    await api.post(`/${prefix}/${id}/poster/upload-url/complete`, { rawKey });
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

  syncRatings: async (id: string): Promise<ExternalRating[]> => {
    const { data } = await api.post<ExternalRating[]>(`/external-ratings/titles/${id}/sync`);
    return data;
  },

  syncAllRatings: async (): Promise<SyncAllRatingsResult> => {
    const { data } = await api.post<SyncAllRatingsResult>(`/external-ratings/sync`);
    return data;
  },

  getCast: async (id: string, locale: ContentLocale): Promise<CastCredit[]> => {
    const { data } = await api.get<CastCredit[]>(`/${prefix}/${id}/cast`, inLocale(locale));
    return data;
  },

  setCast: async (id: string, credits: CastCreditInput[]): Promise<CastCredit[]> => {
    const { data } = await api.put<CastCredit[]>(`/${prefix}/${id}/cast`, { credits });
    return data;
  },

  getTranslations: async (id: string): Promise<TitleTranslation[]> => {
    const { data } = await api.get<TitleTranslation[]>(`/${prefix}/${id}/translations`);
    return data;
  },

  saveTranslation: async (id: string, locale: TranslationLocale, translation: TitleTranslationInput): Promise<TitleTranslation> => {
    const { data } = await api.put<TitleTranslation>(`/${prefix}/${id}/translations/${locale}`, translation);
    return data;
  },

  deleteTranslation: async (id: string, locale: TranslationLocale): Promise<void> => {
    await api.delete(`/${prefix}/${id}/translations/${locale}`);
  },
};

export default TitleService;
