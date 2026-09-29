import { parseApiDate } from "@/shared/lib/parse-api-date";
import api from "@shared/api/axios";
import axios from "axios";
import { Artist, ArtistFilmographyItem, CreateArtistDto, GetAllArtistsDto, UpdateArtistDto } from "../schemas/artist";

const prefix = "artist";

interface ApiArtist extends Omit<Artist, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

const mapArtist = (artist: ApiArtist): Artist => ({
  ...artist,
  createdAt: parseApiDate(artist.createdAt),
  updatedAt: parseApiDate(artist.updatedAt),
});

const ArtistService = {
  getAll: async ({ page = 1, limit = 20, searchString = "" }: GetAllArtistsDto = {}): Promise<{
    items: Artist[];
    totalCount: number;
  }> => {
    const filter: string[] = [];
    if (searchString) filter.push(`name:like:${searchString}`);

    const { data } = await api.get<{ items: ApiArtist[]; totalCount: number }>(`/${prefix}`, {
      params: { page, limit, filter: filter.length ? filter : undefined },
      paramsSerializer: { indexes: null },
    });
    return {
      ...data,
      items: data.items.map(mapArtist),
    };
  },

  getById: async (id: string): Promise<Artist> => {
    const { data } = await api.get<ApiArtist>(`/${prefix}/${id}`);
    return mapArtist(data);
  },

  getFilmography: async (id: string): Promise<ArtistFilmographyItem[]> => {
    const { data } = await api.get<ArtistFilmographyItem[]>(`/${prefix}/${id}/filmography`);
    return data;
  },

  create: async (data: CreateArtistDto): Promise<Artist> => {
    const { data: artist } = await api.post<ApiArtist>(`/${prefix}`, data);
    return mapArtist(artist);
  },

  update: async (id: string, data: UpdateArtistDto): Promise<Artist> => {
    const { data: artist } = await api.patch<ApiArtist>(`/${prefix}/${id}`, data);
    return mapArtist(artist);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/${prefix}/${id}`);
  },

  getPhotoUploadUrl: async (id: string): Promise<{ uploadUrl: string; posterUrl: string }> => {
    const { data } = await api.get<{ uploadUrl: string; posterUrl: string }>(`/${prefix}/${id}/photo-upload-url`);
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
};

export default ArtistService;
