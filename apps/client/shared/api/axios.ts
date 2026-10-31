import Role from "@/types/role";
import { authStore } from "@shared/lib/auth-store";
import { decodeAccessToken, isAccessTokenExpired } from "@shared/lib/decode-jwt";
import { APP } from "@shared/lib/routes";
import { recordServerTime } from "@shared/lib/server-time";
import axios, { type InternalAxiosRequestConfig } from "axios";
import { SessionUnusableError, toApiError } from "./api-error";

const isServer = typeof window === "undefined";

const isServerRuntime = () => typeof window === "undefined";
const baseURL = isServer ? process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL : process.env.NEXT_PUBLIC_BACKEND_API_URL;

const REFRESH_PATH = "/auth/refresh";

type TrackedConfig = InternalAxiosRequestConfig & { _retry?: boolean; _isRefreshCall?: boolean };

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
  withCredentials: true,
});

let proactiveRefreshBlockedUntil = 0;

const BACKOFF_AFTER_FAILURE_MS = 30_000;
const BACKOFF_AFTER_RATE_LIMIT_MS = 60_000;
const BACKOFF_AFTER_ANOMALY_MS = 10 * 60_000;

function blockProactiveRefresh(ms: number, reason: string) {
  proactiveRefreshBlockedUntil = Date.now() + ms;
  console.warn(`[auth] Pausing pre-emptive token refresh for ${Math.round(ms / 1000)}s: ${reason}`);
}

function mayRefreshProactively(): boolean {
  return Date.now() >= proactiveRefreshBlockedUntil;
}

function isSessionRejection(error: unknown): boolean {
  return error instanceof SessionUnusableError || toApiError(error).statusCode === 401;
}

api.interceptors.request.use(async (config: TrackedConfig) => {
  if (isServerRuntime()) return config;

  const token = authStore.getState().token;
  if (!token) return config;

  if (config._isRefreshCall || !isAccessTokenExpired(token) || !mayRefreshProactively()) {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  try {
    config.headers.Authorization = `Bearer ${await getOrRefreshAccessToken()}`;
  } catch (error) {
    const apiError = toApiError(error);

    if (isSessionRejection(error)) {
      console.error(`[auth] Session ended: ${REFRESH_PATH} refused the refresh cookie. Clearing the session.`);
      authStore.getState().clear();
      delete config.headers.Authorization;
      return config;
    }

    blockProactiveRefresh(apiError.statusCode === 429 ? BACKOFF_AFTER_RATE_LIMIT_MS : BACKOFF_AFTER_FAILURE_MS, `${REFRESH_PATH} failed`);
    console.error("[auth] Could not refresh before sending; using the token we have", {
      status: apiError.statusCode,
      message: apiError.message,
      url: config.url,
    });
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function readIdentity(body: { accessToken: string; userId?: string; role?: Role }) {
  const fromToken = decodeAccessToken(body.accessToken);

  if (!body.userId) return fromToken;

  if (typeof body.role === "string" && Object.values(Role).includes(body.role)) {
    return { userId: body.userId, role: body.role };
  }

  return fromToken?.userId === body.userId ? fromToken : null;
}

async function refreshAccessToken(): Promise<string> {
  const { data } = await api.post<{ accessToken: string; userId?: string; role?: Role }>(REFRESH_PATH, undefined, {
    _isRefreshCall: true,
  } as TrackedConfig);

  const identity = readIdentity(data);
  if (!identity) {
    throw new SessionUnusableError("/auth/refresh returned no identity this client can use");
  }

  authStore.getState().setSession({ token: data.accessToken, ...identity });

  if (isAccessTokenExpired(data.accessToken)) {
    blockProactiveRefresh(
      BACKOFF_AFTER_ANOMALY_MS,
      "a token issued moments ago already reads as expired, measured against the server's own clock",
    );
  } else {
    proactiveRefreshBlockedUntil = 0;
  }

  return data.accessToken;
}

let refreshPromise: Promise<string> | null = null;

function getOrRefreshAccessToken(): Promise<string> {
  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function restoreSession(): Promise<void> {
  try {
    await getOrRefreshAccessToken();
  } catch {}
}

api.interceptors.response.use(
  (response) => {
    recordServerTime(response.headers?.date as string | undefined);
    return response;
  },
  async (error) => {
    recordServerTime(error?.response?.headers?.date as string | undefined);
    const originalRequest = error.config as TrackedConfig | undefined;
    const shouldRefresh = error.response?.status === 401 && originalRequest && !originalRequest._retry && !originalRequest._isRefreshCall;

    if (!shouldRefresh) {
      const apiError = toApiError(error);
      console.error("[API Error]", apiError.details || apiError.message);
      return Promise.reject(apiError);
    }

    originalRequest._retry = true;

    if (!mayRefreshProactively()) {
      return Promise.reject(toApiError(error));
    }

    try {
      const accessToken = await getOrRefreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      if (isSessionRejection(refreshError)) {
        console.error("[auth] Session ended after a 401 retry; redirecting to login");
        authStore.getState().clear();
        if (typeof window !== "undefined") window.location.href = APP.LOGIN;
      }
      return Promise.reject(toApiError(refreshError));
    }
  },
);

export function __resetAuthBackoffForTests() {
  proactiveRefreshBlockedUntil = 0;
  refreshPromise = null;
}

export default api;
