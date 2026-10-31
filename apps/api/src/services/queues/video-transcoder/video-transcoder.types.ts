import { VideoType } from "./enums/video-type.enum";

export interface TranscodeVideoJob {
  id: string;
  type: VideoType;
  rawKey: string;
}

export interface VideoTranscodingProgressView {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  progressPercentage: number;
  titleId: string | null;
  episodeId: string | null;
}
