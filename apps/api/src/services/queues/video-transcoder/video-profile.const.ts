export interface VideoVariant {
  width: number;
  height: number;
  bitrate: string;
  name: string;
}

export const VIDEO_VARIANTS: readonly VideoVariant[] = [
  { width: 2560, height: 1440, bitrate: "8000k", name: "1440p" },
  { width: 1920, height: 1080, bitrate: "5000k", name: "1080p" },
  { width: 1280, height: 720, bitrate: "2800k", name: "720p" },
  { width: 854, height: 480, bitrate: "1400k", name: "480p" },
] as const;

export const HLS_SEGMENT_SECONDS = 6;

export const PROGRESS_INTERVAL_MS = 2000;

export const PROCESSED_UPLOAD_CONCURRENCY = 8;
