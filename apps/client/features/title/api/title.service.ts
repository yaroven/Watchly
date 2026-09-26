import { StartMultipartUpload } from "@/shared/api/upload-media";
import { parseApiDate } from "@/shared/lib/parse-api-date";
import api from "@shared/api/axios";
import axios from "axios";
import { CreateTitleDto, GetAllTitlesDto, Title, UpdateTitleDto } from "../schemas/title";

const prefix = "title";

interface ApiTitle extends Omit<Title, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

const mapTitle = (title: ApiTitle): Title => ({
  ...title,
  createdAt: parseApiDate(title.createdAt),
  updatedAt: parseApiDate(title.updatedAt),
});

type TitleCreatePayload = CreateTitleDto;
type TitleUpdatePayload = UpdateTitleDto;

const TitleService = {
  createTitle: async (titleData: TitleCreatePayload): Promise<Title> => {
    const { data } = await api.post<ApiTitle>(`/${prefix}`, titleData);
    return mapTitle(data);
  },

  getAll: async ({
    searchString = "",
    page = 1,
    limit = 10,
    type,
    transcodingStatus,
    director,
    network,
    genreId,
  }: GetAllTitlesDto = {}): Promise<{
    items: Title[];
    totalCount: number;
  }> => {
    // Backend takes `filter=property:rule:value` (repeatable) instead of one query param per field.
    const filter: string[] = [];
    if (searchString) filter.push(`name:like:${searchString}`);
    if (type) filter.push(`type:eq:${type}`);
    if (transcodingStatus) filter.push(`transcodingStatus:eq:${transcodingStatus}`);
    if (director) filter.push(`director:like:${director}`);
    if (network) filter.push(`network:like:${network}`);
    // `genres` is a many-to-many relation, filtered by genre id (not a name substring).
    if (genreId) filter.push(`genres:eq:${genreId}`);

    const { data } = await api.get<{ items: ApiTitle[]; totalCount: number }>(`/${prefix}`, {
      params: { page, limit, filter: filter.length ? filter : undefined },
      // Backend expects repeated `filter=a&filter=b`, not axios's default `filter[]=a&filter[]=b`.
      paramsSerializer: { indexes: null },
    });
    return {
      ...data,
      items: data.items.map(mapTitle),
    };
  },

  getById: async (id: string): Promise<Title> => {
    const { data } = await api.get<ApiTitle>(`/${prefix}/${id}`);
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

  /** Uploads one multipart part and returns the ETag S3 responds with — required to complete the upload. */
  uploadPartToS3: async (url: string, chunk: Blob, onLoaded: (loaded: number) => void): Promise<string> => {
    const response = await axios.put(url, chunk, {
      onUploadProgress: (progressEvent) => onLoaded(progressEvent.loaded),
    });
    const eTag = response.headers.etag as string | undefined;
    if (!eTag) throw new Error("S3 did not return an ETag for the uploaded part");
    return eTag;
  },

  getPosterUploadUrl: async (id: string): Promise<{ uploadUrl: string; posterUrl: string }> => {
    const { data } = await api.get<{ uploadUrl: string; posterUrl: string }>(`/${prefix}/${id}/poster-upload-url`);
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
};

export default TitleService;
