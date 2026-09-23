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

// Shared across all interceptor invocations so concurrent 401s don't each fire their own
// /auth/refresh — they await the same in-flight request and reuse its result.
let refreshPromise: Promise<string> | null = null;

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
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });

      const accessToken = await refreshPromise;
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
