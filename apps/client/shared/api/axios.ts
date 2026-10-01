import Role from "@/types/role";
import { authStore } from "@shared/lib/auth-store";
import { decodeAccessToken, isAccessTokenExpired } from "@shared/lib/decode-jwt";
import { APP } from "@shared/lib/routes";
import axios, { type InternalAxiosRequestConfig } from "axios";
import { ApiError, toApiError } from "./api-error";

const isServer = typeof window === "undefined";
const baseURL = isServer ? process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL : process.env.NEXT_PUBLIC_BACKEND_API_URL;

const REFRESH_PATH = "/auth/refresh";

/** Our own flags on a request config, rather than sniffing the URL for them. */
type TrackedConfig = InternalAxiosRequestConfig & { _retry?: boolean; _isRefreshCall?: boolean };

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  // Without this a hung request never settles: no rejection, no error boundary,
  // and a refresh awaited by other requests blocks all of them indefinitely.
  timeout: 20_000,
  // The refresh token lives in an httpOnly cookie, never in JS — this is what makes the
  // browser attach it to /auth/refresh. Backend CORS must allow credentials for this origin.
  withCredentials: true,
});

/**
 * Set when a token minted moments ago already reads as expired — i.e. this
 * machine's clock is wrong by more than the token's lifetime. Refreshing on
 * every request would then be permanent, rotating the refresh cookie each time
 * and eventually tripping the rate limiter, so the proactive path switches off
 * and the reactive 401 path takes over for the rest of the session.
 */
let clockUntrusted = false;

/** Only a refusal means the session ended; a timeout or a 500 does not. */
function isSessionRejection(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 401;
}

api.interceptors.request.use(async (config: TrackedConfig) => {
  const token = authStore.getState().token;
  if (!token) return config;

  if (config._isRefreshCall || clockUntrusted || !isAccessTokenExpired(token)) {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  // Refresh before sending rather than after being refused: `@OptionalAuth()`
  // routes answer an expired token with 200-anonymous, so no 401 would ever
  // arrive for the response interceptor to act on.
  try {
    config.headers.Authorization = `Bearer ${await getOrRefreshAccessToken()}`;
  } catch (error) {
    if (isSessionRejection(error)) {
      authStore.getState().clear();
      delete config.headers.Authorization;
    } else {
      // Transient — offline, a redeploy, the rate limiter. Send what we have and
      // let the response decide; clearing here would sign the viewer out over a
      // dropped packet.
      console.error("[auth] Could not refresh the access token before sending", toApiError(error).message);
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/** Calls /auth/refresh, applies the session it returns, and returns the new access token. */
async function refreshAccessToken(): Promise<string> {
  const { data } = await api.post<{ accessToken: string; userId?: string; role?: Role }>(REFRESH_PATH, undefined, {
    _isRefreshCall: true,
  } as TrackedConfig);

  // The body is authoritative about identity; the token is only parsed when an
  // older server omits those fields. A token we can neither read nor be told
  // about is a failure, not a session with no identity — that half-state reports
  // a signed-in viewer as anonymous everywhere and keys their cache as such.
  const identity = data.userId && data.role ? { userId: data.userId, role: data.role } : decodeAccessToken(data.accessToken);
  if (!identity) {
    authStore.getState().clear();
    throw new ApiError("Refreshed session carried no usable identity", 401);
  }

  authStore.getState().setSession({ token: data.accessToken, ...identity });

  if (!clockUntrusted && isAccessTokenExpired(data.accessToken)) {
    clockUntrusted = true;
    console.warn(
      "[auth] A freshly issued token already reads as expired — this device's clock is wrong. Refreshing on demand only from now on.",
    );
  }

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
    const originalRequest = error.config as TrackedConfig | undefined;
    const shouldRefresh = error.response?.status === 401 && originalRequest && !originalRequest._retry && !originalRequest._isRefreshCall;

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
      // Same distinction as above: only a refusal ends the session. A transient
      // failure leaves the viewer signed in to retry, rather than bouncing them
      // to the login page off a page they were entitled to see.
      if (isSessionRejection(toApiError(refreshError))) {
        authStore.getState().clear();
        if (typeof window !== "undefined") window.location.href = APP.LOGIN;
      }
      return Promise.reject(toApiError(refreshError));
    }
  },
);

export default api;
