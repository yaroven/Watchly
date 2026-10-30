import { VideoType } from "../../queues/video-transcoder/enums/video-type.enum";

export const VIDEO_ROOT = "videos";
export const VIDEO_MANIFEST_FILE = "master.m3u8";

export type VideoLocation =
  | { type: VideoType.MOVIE; titleId: string }
  | { type: VideoType.EPISODE; titleId: string; seasonId: string; episodeId: string };

export function buildVideoPrefix(location: VideoLocation): string {
  return `${VIDEO_ROOT}/${videoPath(location)}/`;
}

export function buildVideoManifestKey(location: VideoLocation): string {
  return `${buildVideoPrefix(location)}${VIDEO_MANIFEST_FILE}`;
}

export function buildSeasonVideoPrefix(titleId: string, seasonId: string): string {
  return `${VIDEO_ROOT}/${titleId}/${seasonId}/`;
}

export function videoPath(location: VideoLocation): string {
  return location.type === VideoType.EPISODE
    ? `${location.titleId}/${location.seasonId}/${location.episodeId}`
    : location.titleId;
}
