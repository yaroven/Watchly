import type { Level } from "hls.js";

import { VideoQuality } from "./types";

export function clampTime(time: number, duration: number) {
  if (!Number.isFinite(time)) return 0;
  if (!Number.isFinite(duration) || duration <= 0) return Math.max(time, 0);
  return Math.min(Math.max(time, 0), duration);
}

export function formatPlaybackRate(rate: number) {
  return `${Number(rate.toFixed(2)).toString()}x`;
}

export function formatPlayerTime(time: number) {
  const totalSeconds = Math.max(0, Math.floor(time));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => value.toString().padStart(2, "0")).join(":");
  }

  return [minutes, seconds].map((value) => value.toString().padStart(2, "0")).join(":");
}

export function getQualityOptionLabel(option: VideoQuality, options: VideoQuality[], currentLevel: number) {
  if (option.level !== -1 || currentLevel === -1) return option.label;

  const activeOption = options.find((item) => item.level === currentLevel);
  return activeOption ? `Auto (${activeOption.label})` : option.label;
}

export function createQualityOptions(levels: Level[]): VideoQuality[] {
  const manualLevels = levels
    .map((level, index) => {
      const parsedHeight = getLevelHeight(level);
      const bitrate = level.bitrate || getAverageBitrate(level) || 0;
      const label = getQualityLabel(level, parsedHeight, bitrate, index);

      return {
        level: index,
        height: parsedHeight,
        label,
        sortValue: parsedHeight || bitrate,
      };
    })
    .sort((left, right) => right.sortValue - left.sortValue || right.level - left.level)
    .map((level) => ({
      level: level.level,
      height: level.height,
      label: level.label,
    }));

  return [{ level: -1, height: 0, label: "Auto" }, ...manualLevels];
}

function getAverageBitrate(level: Level) {
  const averageBitrate = (level as Level & { averageBitrate?: number }).averageBitrate;
  return averageBitrate ?? 0;
}

function getLevelHeight(level: Level) {
  if (level.height) {
    return level.height;
  }

  const resolution = (level.attrs as { RESOLUTION?: string } | undefined)?.RESOLUTION;
  if (resolution?.includes("x")) {
    const [, parsedHeight] = resolution.split("x");
    const numericHeight = Number.parseInt(parsedHeight || "", 10);

    if (Number.isFinite(numericHeight)) {
      return numericHeight;
    }
  }

  return 0;
}

function getQualityLabel(level: Level, height: number, bitrate: number, index: number) {
  if (height > 0) {
    return `${height}p`;
  }

  if (bitrate) {
    return `${Math.round(bitrate / 1000)} kbps`;
  }

  if (level.name) {
    return level.name;
  }

  return `Quality ${index + 1}`;
}

export function getBufferedTime(video: HTMLVideoElement) {
  const { buffered, currentTime } = video;

  for (let index = 0; index < buffered.length; index += 1) {
    if (buffered.start(index) <= currentTime && buffered.end(index) >= currentTime) {
      return buffered.end(index);
    }
  }

  return currentTime;
}
