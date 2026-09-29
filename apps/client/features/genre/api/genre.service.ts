import { parseApiDate } from "@/shared/lib/parse-api-date";
import api from "@shared/api/axios";
import { CreateGenreDto, Genre, GetAllGenresDto, UpdateGenreDto } from "../schemas/genre";

const prefix = "genre";

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
  getAll: async ({ page = 1, limit = 100 }: GetAllGenresDto = {}): Promise<{
    items: Genre[];
    totalCount: number;
  }> => {
    const { data } = await api.get<{ items: ApiGenre[]; totalCount: number }>(`/${prefix}`, {
      params: { page, limit },
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
};

export default GenreService;
