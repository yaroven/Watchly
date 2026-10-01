import Role from "@/types/role";
import { authStore } from "@shared/lib/auth-store";
import { decodeAccessToken, isAccessTokenExpired } from "@shared/lib/decode-jwt";
import { APP } from "@shared/lib/routes";
import { recordServerTime } from "@shared/lib/server-time";
import axios, { type InternalAxiosRequestConfig } from "axios";
import { SessionUnusableError, toApiError } from "./api-error";

const isServer = typeof window === "undefined";

/** Evaluated per call, not at module load, so a test can stand a window up around it. */
const isServerRuntime = () => typeof window === "undefined";
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
 * Refreshing is paused until this timestamp; `0` means allowed.
 *
 * Module-level, therefore per-browser-tab on the client and per-process on the
 * server — which is why the request interceptor refuses to use any of it when
 * `isServer`, and why `restoreSession` is only ever called from a client
 * component. Nothing here may become a place where one request's state is
 * visible to another's.
 *
 * Set from two places: a refresh attempt that failed, and a refresh that
 * succeeded into a token already past its `exp`. Without it every request fires
 * its own doomed refresh first, doubling the load against one rate limiter.
 *
 * **While a window is open the viewer reads as signed-out on public routes** —
 * their token goes out stale and `@OptionalAuth()` answers 200-anonymous, so no
 * 401 arrives for the response interceptor either. Time-boxing bounds that
 * symptom; it does not remove it. Thirty seconds of it is a reasonable trade
 * against a refresh storm, which is why the windows are short and why the
 * ten-minute one is reserved for a server anomaly rather than a clock problem —
 * clock skew is handled by measuring against the server's `Date` header instead,
 * precisely so it never reaches here and never re-arms on success.
 */
let proactiveRefreshBlockedUntil = 0;

const BACKOFF_AFTER_FAILURE_MS = 30_000;
const BACKOFF_AFTER_RATE_LIMIT_MS = 60_000;
/** Not a clock problem — the offset handles those — so something is genuinely wrong. */
const BACKOFF_AFTER_ANOMALY_MS = 10 * 60_000;

function blockProactiveRefresh(ms: number, reason: string) {
  proactiveRefreshBlockedUntil = Date.now() + ms;
  console.warn(`[auth] Pausing pre-emptive token refresh for ${Math.round(ms / 1000)}s: ${reason}`);
}

/** Guards both the pre-emptive path and the reactive retry. */
function mayRefreshProactively(): boolean {
  return Date.now() >= proactiveRefreshBlockedUntil;
}

/**
 * Whether this failure ends the session.
 *
 * Only two things do: the refresh cookie being refused, and a refresh that
 * answered with nothing usable. A timeout, a 5xx or a rate limit does not —
 * tearing the session down for those signs a viewer out over a dropped packet.
 *
 * Both callers pass a raw rejection; `toApiError` is idempotent on an ApiError.
 */
function isSessionRejection(error: unknown): boolean {
  return error instanceof SessionUnusableError || toApiError(error).statusCode === 401;
}

api.interceptors.request.use(async (config: TrackedConfig) => {
  // Server-side there is no session to refresh and no per-viewer state to hold:
  // this module is imported by server components, where `authStore` and the
  // backoff below are process-wide and shared across every concurrent request.
  // Returning early keeps all of it unreachable there rather than merely unused.
  if (isServerRuntime()) return config;

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

    if (isSessionRejection(error)) {
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
  const fromToken = decodeAccessToken(body.accessToken);

  // The body is authoritative about *who*, but it is unvalidated wire data about
  // *what role*: one the client does not know would be stored and then match
  // nothing, bouncing the viewer off role-gated pages as if unauthorised.
  if (!body.userId) return fromToken;

  if (typeof body.role === "string" && Object.values(Role).includes(body.role)) {
    return { userId: body.userId, role: body.role };
  }

  // Falling back to the token is only safe while both describe the same person.
  // Taking the token's identity wholesale would silently swap the viewer — cache
  // keys, likes, watchlist and every write would run as somebody else.
  return fromToken?.userId === body.userId ? fromToken : null;
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
    throw new SessionUnusableError("/auth/refresh returned no identity this client can use");
  }

  authStore.getState().setSession({ token: data.accessToken, ...identity });

  if (isAccessTokenExpired(data.accessToken)) {
    // With the server-time offset applied this should be unreachable; if it is
    // not, the server is minting tokens already past their `exp`, or they carry
    // no readable one. Either way, stop pre-empting — the reason will not change
    // within the window, and re-arming on every success is how the last version
    // of this became a latch that could never clear.
    blockProactiveRefresh(
      BACKOFF_AFTER_ANOMALY_MS,
      "a token issued moments ago already reads as expired, measured against the server's own clock",
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
      // Backing off covers both paths: otherwise a request that failed to refresh
      // pre-emptively immediately tries again on the 401 the stale token earns,
      // doubling the attempts the backoff exists to stop.
      return Promise.reject(toApiError(error));
    }

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
