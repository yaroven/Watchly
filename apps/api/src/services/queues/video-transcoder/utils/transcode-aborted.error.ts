/**
 * Its own file so that the scheduler, the state service and the orchestration
 * can all throw and catch it without importing the ffmpeg wrapper.
 *
 * `.error.ts` is a new suffix for this codebase — CLAUDE.md's list would need
 * the line if this shape is kept.
 */
export class TranscodeAbortedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscodeAbortedError";
  }
}

export const abortIsWarning = (error: unknown): "warn" | "error" =>
  error instanceof TranscodeAbortedError ? "warn" : "error";
