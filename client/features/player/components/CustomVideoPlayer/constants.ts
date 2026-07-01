export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export const TimelineShortcutSeek = 5;

export const VolumeShortcutSeek = 0.1;
