import api from "@/shared/api/axios";
import { StartMultipartUpload } from "@/shared/api/upload-media";
import { parseApiDate } from "@/shared/lib/parse-api-date";
import axios from "axios";
import { CreateEpisodeDto, Episode, UpdateEpisodeDto } from "../schemas/episode";

const prefix = "episode";

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
  getAll: async (seasonId: string): Promise<Episode[]> => {
    const { data } = await api.get<ApiEpisode[]>(`/${prefix}`, {
      params: { filter: [`seasonId:eq:${seasonId}`] },
      paramsSerializer: { indexes: null },
    });
    return data.map(mapEpisode);
  },

  getById: async (id: string): Promise<Episode> => {
    const { data } = await api.get<ApiEpisode>(`/${prefix}/${id}`);
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

  /** Uploads one multipart part and returns the ETag S3 responds with — required to complete the upload. */
  uploadPartToS3: async (url: string, chunk: Blob, onLoaded: (loaded: number) => void): Promise<string> => {
    const response = await axios.put(url, chunk, {
      onUploadProgress: (progressEvent) => onLoaded(progressEvent.loaded),
    });
    const eTag = response.headers.etag as string | undefined;
    if (!eTag) throw new Error("S3 did not return an ETag for the uploaded part");
    return eTag;
  },
};

export default EpisodeService;
