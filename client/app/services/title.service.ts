import axios from "axios";
import { CreateTitleDto, GetAllTitlesDto, Title, UpdateTitleDto } from "../types/title";
import api from "./axios";

const prefix = "title";

export const TitleService = {
  /**
   * Create a new title (Movie or Series).
   */
  createTitle: async (titleData: Omit<CreateTitleDto, "videoFile">): Promise<Title> => {
    const { data } = await api.post<Title>(`/${prefix}`, titleData);
    return data;
  },

  /**
   * Get all titles with optional pagination and search.
   */
  getAll: async ({ searchString = "", page = 1, limit = 10, type }: GetAllTitlesDto = {}): Promise<{
    items: Title[];
    totalCount: number;
  }> => {
    const { data } = await api.get<{ items: Title[]; totalCount: number }>(`/${prefix}`, {
      params: { search: searchString, page, limit, type },
    });
    return data;
  },

  /**
   * Get a single title by its ID.
   */
  getById: async (id: string): Promise<Title> => {
    const { data } = await api.get<Title>(`/${prefix}/${id}`);
    return data;
  },

  /**
   * Get the streaming URL for a title's video.
   */
  getStreamUrl: async (id: string): Promise<string> => {
    const { data } = await api.get<{ url: string }>(`/${prefix}/${id}/video`);
    return data.url;
  },

  /**
   * Get a pre-signed upload URL for uploading a video file.
   */
  getUploadUrl: async (id: string): Promise<string> => {
    const { data } = await api.get<{ url: string }>(`/${prefix}/${id}/upload-url`);
    return data.url;
  },

  /**
   * Upload a file to S3 using a pre-signed URL.
   * Includes a workaround for LocalStack host resolution.
   */
  async uploadToS3(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
    const uploadUrl = url.replace("localstack", "localhost");

    await axios.put(uploadUrl, file, {
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
  /**
   * Update a title.
   */
  update: async (id: string, titleData: UpdateTitleDto): Promise<Title> => {
    const { data } = await api.patch<Title>(`/${prefix}/${id}`, titleData);
    return data;
  },

  /**
   * Delete a title.
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/${prefix}/${id}`);
  },
};
