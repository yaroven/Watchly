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

export class SessionUnusableError extends ApiError {
  constructor(detail: string) {
    super("Your session could not be restored. Please sign in again.");
    this.name = "SessionUnusableError";
    this.details = detail;
  }
}

function readServerMessage(data: unknown): string | undefined {
  const payload = data as { message?: string | string[]; error?: string } | undefined;
  return (Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message || payload?.error) || undefined;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    const message = readServerMessage(error.response?.data) || error.message;

    return new ApiError(message, statusCode, error.response?.data);
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError("Unexpected API error");
}

export type ApiErrorMessageKey =
  | "sessionUnusable"
  | "unexpected"
  | "network"
  | "badRequest"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "tooLarge"
  | "rateLimited"
  | "server";

const STATUS_MESSAGE_KEYS: Partial<Record<number, ApiErrorMessageKey>> = {
  400: "badRequest",
  401: "unauthorized",
  403: "forbidden",
  404: "notFound",
  409: "conflict",
  413: "tooLarge",
  429: "rateLimited",
};

export function describeApiError(
  error: unknown,
  t: (key: ApiErrorMessageKey) => string,
  overrides: Partial<Record<number, string>> = {},
): string {
  if (error instanceof SessionUnusableError) return t("sessionUnusable");
  if (!(error instanceof ApiError)) return t("unexpected");
  if (error.statusCode === undefined) return t("network");

  const override = overrides[error.statusCode];
  if (override !== undefined) return override;
  if (error.statusCode >= 500) return t("server");
  return t(STATUS_MESSAGE_KEYS[error.statusCode] ?? "unexpected");
}
