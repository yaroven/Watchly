/**
 * The counterpart to image-profile.const.ts: a profile is data, not behaviour,
 * so it does not live on the class that applies it.
 */
export interface VideoVariant {
  width: number;
  height: number;
  bitrate: string;
  name: string;
}

/** Descending, because the lowest is the fallback when the source is smaller. */
export const VIDEO_VARIANTS: readonly VideoVariant[] = [
  { width: 2560, height: 1440, bitrate: "8000k", name: "1440p" },
  { width: 1920, height: 1080, bitrate: "5000k", name: "1080p" },
  { width: 1280, height: 720, bitrate: "2800k", name: "720p" },
  { width: 854, height: 480, bitrate: "1400k", name: "480p" },
] as const;

export const HLS_SEGMENT_SECONDS = 6;

/** How often the ffmpeg progress handler reports and re-checks for an abort. */
export const PROGRESS_INTERVAL_MS = 2000;

export const PROCESSED_UPLOAD_CONCURRENCY = 8;
