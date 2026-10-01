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
 * Proactive refresh backs off for a while after it fails; `0` means "allowed".
 *
 * One time-boxed window rather than a permanent kill switch. Both failure modes
 * it covers — a refresh endpoint that is down, and a device clock so wrong that
 * every freshly minted token reads as already expired — would otherwise make
 * *every* request fire its own doomed refresh first. A latch stops that but
 * never recovers, and there is nothing to recover into: `@OptionalAuth()` routes
 * answer an expired token with 200-anonymous, so no 401 ever arrives for the
 * response interceptor to act on and the viewer reads as signed-out until reload.
 */
let proactiveRefreshBlockedUntil = 0;

const BACKOFF_AFTER_FAILURE_MS = 30_000;
const BACKOFF_AFTER_RATE_LIMIT_MS = 60_000;
/** A clock this wrong will not fix itself in thirty seconds, but it may be fixed by hand. */
const BACKOFF_AFTER_CLOCK_SKEW_MS = 10 * 60_000;

function blockProactiveRefresh(ms: number, reason: string) {
  proactiveRefreshBlockedUntil = Date.now() + ms;
  console.warn(`[auth] Pausing pre-emptive token refresh for ${Math.round(ms / 1000)}s: ${reason}`);
}

function mayRefreshProactively(): boolean {
  return Date.now() >= proactiveRefreshBlockedUntil;
}

/** Only a refusal means the session ended; a timeout, a 5xx or a rate limit does not. */
function isSessionRejection(error: unknown): boolean {
  return toApiError(error).statusCode === 401;
}

api.interceptors.request.use(async (config: TrackedConfig) => {
  const token = authStore.getState().token;
  if (!token) return config;

  if (config._isRefreshCall || !isAccessTokenExpired(token) || !mayRefreshProactively()) {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  // Refresh before sending rather than after being refused: `@OptionalAuth()`
  // routes answer an expired token with 200-anonymous, so no 401 would ever
  // arrive for the response interceptor to act on.
  try {
    config.headers.Authorization = `Bearer ${await getOrRefreshAccessToken()}`;
  } catch (error) {
    const apiError = toApiError(error);

    if (apiError.statusCode === 401) {
      console.error(`[auth] Session ended: ${REFRESH_PATH} refused the refresh cookie. Clearing the session.`);
      authStore.getState().clear();
      delete config.headers.Authorization;
      return config;
    }

    // Transient — offline, a redeploy, the rate limiter. Send what we have and
    // let the response decide; clearing here would sign the viewer out over a
    // dropped packet. Back off so the next request does not repeat this.
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

/** The viewer the refresh response describes, or null if it describes none we can use. */
function readIdentity(body: { accessToken: string; userId?: string; role?: Role }) {
  // The body is authoritative, but it is still unvalidated wire data: a role the
  // client does not know would be stored and then match nothing, and the viewer
  // would be bounced off role-gated pages as if unauthorised.
  const roleIsKnown = typeof body.role === "string" && Object.values(Role).includes(body.role);
  if (body.userId && roleIsKnown) return { userId: body.userId, role: body.role as Role };

  return decodeAccessToken(body.accessToken);
}

/** Calls /auth/refresh, applies the session it returns, and returns the new access token. */
async function refreshAccessToken(): Promise<string> {
  const { data } = await api.post<{ accessToken: string; userId?: string; role?: Role }>(REFRESH_PATH, undefined, {
    _isRefreshCall: true,
  } as TrackedConfig);

  const identity = readIdentity(data);
  if (!identity) {
    // The refresh succeeded; we just cannot build a session from it. Not a
    // refusal, so the existing session stays rather than being torn down — and
    // storing the token without an identity would report a signed-in viewer as
    // anonymous everywhere while keying their cache as such.
    console.error("[auth] /auth/refresh returned no identity this client can use; keeping the current session");
    throw new ApiError("Refreshed session carried no usable identity");
  }

  authStore.getState().setSession({ token: data.accessToken, ...identity });

  if (isAccessTokenExpired(data.accessToken)) {
    blockProactiveRefresh(
      BACKOFF_AFTER_CLOCK_SKEW_MS,
      "a token issued moments ago already reads as expired — this device's clock is wrong, or the token carries no readable `exp`",
    );
  } else {
    proactiveRefreshBlockedUntil = 0;
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
      // Same distinction as in the request interceptor: only a refusal ends the
      // session. A transient failure leaves the viewer signed in to retry rather
      // than bouncing them to the login page off a page they were entitled to see.
      if (isSessionRejection(refreshError)) {
        console.error("[auth] Session ended after a 401 retry; redirecting to login");
        authStore.getState().clear();
        if (typeof window !== "undefined") window.location.href = APP.LOGIN;
      }
      return Promise.reject(toApiError(refreshError));
    }
  },
);

/** Test seam: the backoff is module state and would otherwise leak between cases. */
export function __resetAuthBackoffForTests() {
  proactiveRefreshBlockedUntil = 0;
  refreshPromise = null;
}

export default api;
