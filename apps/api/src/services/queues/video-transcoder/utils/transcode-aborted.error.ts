export class TranscodeAbortedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscodeAbortedError";
  }
}

export const abortIsWarning = (error: unknown): "warn" | "error" =>
  error instanceof TranscodeAbortedError ? "warn" : "error";
