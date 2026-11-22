import TranscodingStatus from "@/types/transcoding-status";

export const TRANSCODING_POLL_MS = 5000;

const ACTIVE = new Set<TranscodingStatus>([TranscodingStatus.PENDING, TranscodingStatus.PROCESSING]);

export const isTranscodingActive = (status: TranscodingStatus | null | undefined) => !!status && ACTIVE.has(status);

export function transcodingPollInterval(statuses: readonly (TranscodingStatus | null | undefined)[]): number | false {
  return statuses.some(isTranscodingActive) ? TRANSCODING_POLL_MS : false;
}
