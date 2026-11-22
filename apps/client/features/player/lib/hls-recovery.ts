export type FatalHlsError = "network" | "media" | "other";

export type HlsRecovery = "restart-load" | "recover-media" | "give-up";

export const MAX_HLS_RECOVERIES = 3;

export function nextHlsRecovery(error: FatalHlsError, attemptsSoFar: number): HlsRecovery {
  if (error === "other" || attemptsSoFar >= MAX_HLS_RECOVERIES) return "give-up";
  return error === "network" ? "restart-load" : "recover-media";
}
