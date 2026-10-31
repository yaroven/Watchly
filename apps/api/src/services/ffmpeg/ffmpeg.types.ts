export interface FfmpegJob {
  input: string;
  output: string;
  format?: string;
  videoFilters?: string[];
  frames?: number;
  outputOptions: string[];
}

export interface FfmpegHooks {
  onStart?: (commandLine: string) => void;
  onProgress?: (percent: number | undefined) => void;
}

export interface FfmpegHandle {
  done: Promise<void>;
  kill(): void;
}

export type MediaStreamKind = "video" | "audio" | "other";

export interface MediaStream {
  kind: MediaStreamKind;
  width?: number;
  height?: number;
}

export interface MediaInfo {
  streams: MediaStream[];
}
