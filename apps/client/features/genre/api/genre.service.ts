import { parseApiDate } from "@/shared/lib/parse-api-date";
import api from "@shared/api/axios";
import { type ContentLocale, inLocale, type TranslationLocale } from "@shared/lib/content-locale";
import { CreateGenreDto, Genre, GenreTranslation, GenreTranslationInput, GetAllGenresDto, UpdateGenreDto } from "../schemas/genre";

const prefix = "genres";

interface ApiGenre extends Omit<Genre, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

const mapGenre = (genre: ApiGenre): Genre => ({
  ...genre,
  createdAt: parseApiDate(genre.createdAt),
  updatedAt: parseApiDate(genre.updatedAt),
});

const GenreService = {
  getAll: async (
    { page = 1, limit = 100 }: GetAllGenresDto = {},
    locale: ContentLocale,
  ): Promise<{
    items: Genre[];
    totalCount: number;
  }> => {
    const { data } = await api.get<{ items: ApiGenre[]; totalCount: number }>(`/${prefix}`, {
      params: { page, limit },
      ...inLocale(locale),
    });
    return {
      ...data,
      items: data.items.map(mapGenre),
    };
  },

  create: async (data: CreateGenreDto): Promise<Genre> => {
    const { data: genre } = await api.post<ApiGenre>(`/${prefix}`, data);
    return mapGenre(genre);
  },

  update: async (id: string, data: UpdateGenreDto): Promise<Genre> => {
    const { data: genre } = await api.patch<ApiGenre>(`/${prefix}/${id}`, data);
    return mapGenre(genre);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/${prefix}/${id}`);
  },

  getTranslations: async (id: string): Promise<GenreTranslation[]> => {
    const { data } = await api.get<GenreTranslation[]>(`/${prefix}/${id}/translations`);
    return data;
  },

  saveTranslation: async (id: string, locale: TranslationLocale, translation: GenreTranslationInput): Promise<GenreTranslation> => {
    const { data } = await api.put<GenreTranslation>(`/${prefix}/${id}/translations/${locale}`, translation);
    return data;
  },

  deleteTranslation: async (id: string, locale: TranslationLocale): Promise<void> => {
    await api.delete(`/${prefix}/${id}/translations/${locale}`);
  },
};

export default GenreService;
