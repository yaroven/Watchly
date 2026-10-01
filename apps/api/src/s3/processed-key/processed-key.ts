import { VideoType } from "../../video-transcoder/enums/video-type.enum";

/**
 * Where a transcode's output lives in the processed bucket.
 *
 * The counterpart to `raw-key`, for the other end of the pipeline. The scheme was
 * previously six string literals in five files — `videos/${id}/`,
 * `videos/${titleId}/${seasonId}/${id}/master.m3u8`, and the worker's own
 * `uploadPath`, which builds the same thing a different way. A mismatch between
 * any two of them is silent: the writer puts the output somewhere the reader does
 * not look, and the reader answers with a presigned URL for nothing.
 */
export const VIDEO_ROOT = "videos";
export const VIDEO_MANIFEST_FILE = "master.m3u8";

export type VideoLocation =
  | { type: VideoType.MOVIE; titleId: string }
  | { type: VideoType.EPISODE; titleId: string; seasonId: string; episodeId: string };

/** Always ends in "/" — it addresses a folder, and `deleteFolder` matches on the prefix. */
export function buildVideoPrefix(location: VideoLocation): string {
  return `${VIDEO_ROOT}/${videoPath(location)}/`;
}

export function buildVideoManifestKey(location: VideoLocation): string {
  return `${buildVideoPrefix(location)}${VIDEO_MANIFEST_FILE}`;
}

/** Everything under one season, for cleanup when the season itself goes. */
export function buildSeasonVideoPrefix(titleId: string, seasonId: string): string {
  return `${VIDEO_ROOT}/${titleId}/${seasonId}/`;
}

/**
 * The path below the root, without the root or a trailing slash. The worker
 * composes its own object keys per output file, so it needs this part alone.
 */
export function videoPath(location: VideoLocation): string {
  return location.type === VideoType.EPISODE
    ? `${location.titleId}/${location.seasonId}/${location.episodeId}`
    : location.titleId;
}
