import { VideoTranscodingProgress } from "@prisma/client";
import { VideoTranscodingProgressView } from "./video-transcoder.types";

export const toVideoTranscodingProgressView = (
  progress: VideoTranscodingProgress,
): VideoTranscodingProgressView => ({
  id: progress.id,
  createdAt: progress.createdAt,
  updatedAt: progress.updatedAt,
  progressPercentage: progress.progressPercentage,
  titleId: progress.titleId,
  episodeId: progress.episodeId,
});
