import { parseApiDate } from "@/shared/lib/parse-api-date";
import api from "@shared/api/axios";
import { Genre, GetAllGenresDto } from "../schemas/genre";

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
};

export default GenreService;
