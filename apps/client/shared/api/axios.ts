import { authStore } from "@shared/lib/auth-store";
import { decodeAccessToken } from "@shared/lib/decode-jwt";
import { APP } from "@shared/lib/routes";
import axios from "axios";
import { toApiError } from "./api-error";

const isServer = typeof window === "undefined";
const baseURL = isServer ? process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL : process.env.NEXT_PUBLIC_BACKEND_API_URL;

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  // The refresh token lives in an httpOnly cookie, never in JS — this is what makes the
  // browser attach it to /auth/refresh. Backend CORS must allow credentials for this origin.
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = authStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Calls /auth/refresh, applies the decoded claims to the store, and returns the new access token. */
async function refreshAccessToken(): Promise<string> {
  const { data } = await api.post<{ accessToken: string }>("/auth/refresh");
  const claims = decodeAccessToken(data.accessToken);

  if (claims) authStore.getState().setSession({ token: data.accessToken, ...claims });
  else authStore.getState().setToken(data.accessToken);

  return data.accessToken;
}

// Shared across all callers so concurrent 401s (or a 401 racing the app-boot session
// restore below) don't each fire their own /auth/refresh — they await the same
// in-flight request and reuse its result.
let refreshPromise: Promise<string> | null = null;

function getOrRefreshAccessToken(): Promise<string> {
  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

/**
 * Restores the session from the httpOnly refresh cookie on app boot. The auth store starts
 * empty on every hard navigation, so without this, role-gated views never see a role and
 * never render — see AuthorizeView.
 */
export async function restoreSession(): Promise<void> {
  try {
    await getOrRefreshAccessToken();
  } catch {
    // No valid refresh cookie (logged out / expired) — leave the store empty.
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshCall = typeof originalRequest?.url === "string" && originalRequest.url.includes("/auth/refresh");
    const shouldRefresh = error.response?.status === 401 && originalRequest && !originalRequest._retry && !isRefreshCall;

    if (!shouldRefresh) {
      const apiError = toApiError(error);
      console.error("[API Error]", apiError.details || apiError.message);
      return Promise.reject(apiError);
    }

    originalRequest._retry = true;

    try {
      const accessToken = await getOrRefreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      authStore.getState().clear();
      if (typeof window !== "undefined") window.location.href = APP.LOGIN;
      return Promise.reject(toApiError(refreshError));
    }
  },
);

export default api;
