import axios from "axios";

export class ApiError extends Error {
  statusCode?: number;
  details?: unknown;

  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * The refresh call answered, but carried nothing we can build a session from.
 *
 * Neither a refusal nor transient, and it must not be mistaken for either: as a
 * 401 it would look like a password problem, and as a transient failure the
 * viewer stays pinned with a dead token — signed in according to the store,
 * anonymous according to every read, and never sent anywhere to fix it.
 */
export class SessionUnusableError extends ApiError {
  constructor(detail: string) {
    super("Your session could not be restored. Please sign in again.");
    this.name = "SessionUnusableError";
    this.details = detail;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    const payload = error.response?.data as { message?: string | string[]; error?: string } | undefined;
    const message = Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message || payload?.error || error.message;

    return new ApiError(message, statusCode, error.response?.data);
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError("Unexpected API error");
}
