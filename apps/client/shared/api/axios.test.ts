import Role from "@/types/role";
import { authStore } from "@shared/lib/auth-store";
import { APP } from "@shared/lib/routes";
import { __resetServerTimeForTests } from "@shared/lib/server-time";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionUnusableError } from "./api-error";
import api, { __resetAuthBackoffForTests } from "./axios";

function tokenWith(payload: Record<string, unknown>): string {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
}

const EXPIRED = tokenWith({ userId: "u1", role: Role.USER, exp: Math.floor(Date.now() / 1000) - 60 });
const FRESH = tokenWith({ userId: "u1", role: Role.USER, exp: Math.floor(Date.now() / 1000) + 3600 });

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(api);
  __resetAuthBackoffForTests();
  __resetServerTimeForTests();
  vi.stubGlobal("window", { location: { href: "" } });
  authStore.getState().clear();
  authStore.getState().setStatus("resolved");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  mock.restore();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function signIn(token: string) {
  authStore.getState().setSession({ token, userId: "u1", role: Role.USER });
}

describe("pre-emptive refresh", () => {
  it("should refresh an expired token before sending it, not wait for a 401", async () => {
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").reply(200, { accessToken: FRESH, userId: "u1", role: Role.USER });
    mock.onGet("/title").reply(200, []);

    await api.get("/title");

    const sent = mock.history.get[0];
    expect(sent.headers?.Authorization).toBe(`Bearer ${FRESH}`);
    expect(authStore.getState().token).toBe(FRESH);
  });

  it("should leave a valid token alone", async () => {
    signIn(FRESH);
    mock.onGet("/title").reply(200, []);

    await api.get("/title");

    expect(mock.history.post).toHaveLength(0);
  });
});

describe("when the refresh fails", () => {
  // Clearing on any failure signs a viewer out over a dropped packet.
  it("should keep the session and send the stale token on a transient failure", async () => {
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").reply(500);
    mock.onGet("/title").reply(200, []);

    await api.get("/title");

    expect(authStore.getState().token).toBe(EXPIRED);
    expect(mock.history.get[0].headers?.Authorization).toBe(`Bearer ${EXPIRED}`);
  });

  it("should end the session only when the refresh cookie is refused", async () => {
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").reply(401);
    mock.onGet("/title").reply(200, []);

    await api.get("/title");

    expect(authStore.getState().token).toBeNull();
    expect(mock.history.get[0].headers?.Authorization).toBeUndefined();
  });

  it("should say so before tearing the session down", async () => {
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").reply(401);
    mock.onGet("/title").reply(200, []);

    await api.get("/title");

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Session ended"));
  });

  // Without a cool-off every request fires its own doomed refresh first, which
  // doubles the request count against one global rate limiter.
  it("should back off instead of retrying the refresh on every subsequent request", async () => {
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").reply(500);
    mock.onGet("/title").reply(200, []);

    await api.get("/title");
    await api.get("/title");
    await api.get("/title");

    expect(mock.history.post).toHaveLength(1);
  });
});

describe("identity from the refresh response", () => {
  it("should prefer the body over parsing the token", async () => {
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").reply(200, { accessToken: FRESH, userId: "u2", role: Role.ADMIN });
    mock.onGet("/title").reply(200, []);

    await api.get("/title");

    expect(authStore.getState().userId).toBe("u2");
    expect(authStore.getState().role).toBe(Role.ADMIN);
  });

  // A role the client does not know would be stored and then match nothing, and the
  // viewer would be bounced off role-gated pages as if unauthorised.
  it("should fall back to the token's role when the body carries one it does not know", async () => {
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").reply(200, { accessToken: FRESH, userId: "u1", role: "superuser" });
    mock.onGet("/title").reply(200, []);

    await api.get("/title");

    expect(authStore.getState().userId).toBe("u1");
    expect(authStore.getState().role).toBe(Role.USER);
  });

  // Falling back wholesale would store a different person than the server named.
  it("should refuse rather than swap the viewer when body and token disagree about who", async () => {
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").reply(200, { accessToken: FRESH, userId: "u2", role: "superuser" });
    mock.onGet("/title").reply(200, []);

    await api.get("/title");

    expect(authStore.getState().userId).not.toBe("u1");
    expect(authStore.getState().token).toBeNull();
  });

  // Neither a refusal nor transient. Storing the token without an identity would
  // report a signed-in viewer as anonymous everywhere; treating it as transient
  // pins them with a dead token and never sends them anywhere to fix it.
  it("should end the session when the response carries no usable identity", async () => {
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").reply(200, { accessToken: "opaque-token" });
    mock.onGet("/title").reply(200, []);

    await api.get("/title");

    expect(authStore.getState().token).toBeNull();
  });

  // The message reaches the viewer verbatim through the mutation alerts.
  it("should not put the internal reason in front of the viewer", async () => {
    const detail = new SessionUnusableError("/auth/refresh returned no identity this client can use");

    expect(detail.message).toBe("Your session could not be restored. Please sign in again.");
    expect(detail.details).toContain("no identity this client can use");
  });
});

describe("the backoff window", () => {
  // Every other case calls the reset seam first, which would hide a module that
  // ships blocked from the start. This one takes the module as it loads.
  it("should start out allowing pre-emptive refresh", async () => {
    vi.resetModules();
    const [{ default: freshApi }, { authStore: freshStore }] = await Promise.all([import("./axios"), import("@shared/lib/auth-store")]);
    const freshMock = new MockAdapter(freshApi);
    freshStore.getState().setSession({ token: EXPIRED, userId: "u1", role: Role.USER });
    freshMock.onPost("/auth/refresh").reply(200, { accessToken: FRESH, userId: "u1", role: Role.USER });
    freshMock.onGet("/title").reply(200, []);

    await freshApi.get("/title");

    expect(freshMock.history.post).toHaveLength(1);
    freshMock.restore();
  });

  // "For a while" is the whole difference between this and the kill switch the
  // previous version shipped, and nothing but time control can express it.
  it("should resume pre-emptive refreshing once the cool-off has passed", async () => {
    vi.useFakeTimers();
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").reply(500);
    mock.onGet("/title").reply(200, []);

    await api.get("/title");
    await api.get("/title");
    expect(mock.history.post).toHaveLength(1);

    vi.advanceTimersByTime(30_001);
    await api.get("/title");

    expect(mock.history.post).toHaveLength(2);
  });

  it("should hold a rate limit for longer than an ordinary failure", async () => {
    vi.useFakeTimers();
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").reply(429);
    mock.onGet("/title").reply(200, []);

    await api.get("/title");
    vi.advanceTimersByTime(30_001);
    await api.get("/title");
    expect(mock.history.post).toHaveLength(1);

    vi.advanceTimersByTime(30_000);
    await api.get("/title");

    expect(mock.history.post).toHaveLength(2);
  });

  it("should clear the window as soon as a refresh succeeds", async () => {
    vi.useFakeTimers();
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").replyOnce(500);
    mock.onGet("/title").reply(200, []);

    await api.get("/title");
    vi.advanceTimersByTime(30_001);

    mock.onPost("/auth/refresh").reply(200, { accessToken: FRESH, userId: "u1", role: Role.USER });
    await api.get("/title");
    authStore.getState().setSession({ token: EXPIRED, userId: "u1", role: Role.USER });
    await api.get("/title");

    // Third refresh attempted immediately: the success wiped the window rather
    // than leaving it to expire.
    expect(mock.history.post).toHaveLength(3);
  });
});

describe("a server minting tokens that already read as expired", () => {
  // Otherwise a refresh per request, forever, rotating the refresh cookie each time.
  it("should stop pre-empting rather than retrying on every request", async () => {
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").reply(200, { accessToken: EXPIRED, userId: "u1", role: Role.USER });
    mock.onGet("/title").reply(200, []);

    await api.get("/title");
    await api.get("/title");

    expect(mock.history.post).toHaveLength(1);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Pausing pre-emptive token refresh"));
  });
});

/**
 * The other half of the file: the branch that clears sessions and navigates the
 * browser. Driven through a 401 on a normal request rather than an expired token,
 * so the request interceptor stays out of the way.
 */
describe("the reactive 401 path", () => {
  it("should refresh once and retry the original request", async () => {
    signIn(FRESH);
    mock
      .onGet("/title")
      .replyOnce(401)
      .onGet("/title")
      .reply(200, [{ id: "t1" }]);
    mock.onPost("/auth/refresh").reply(200, { accessToken: FRESH, userId: "u1", role: Role.USER });

    const response = await api.get("/title");

    expect(response.status).toBe(200);
    expect(mock.history.post).toHaveLength(1);
    expect(authStore.getState().token).toBe(FRESH);
  });

  it("should end the session and send the viewer to login when the refresh is refused", async () => {
    signIn(FRESH);
    mock.onGet("/title").reply(401);
    mock.onPost("/auth/refresh").reply(401);

    await expect(api.get("/title")).rejects.toThrow();

    expect(authStore.getState().token).toBeNull();
    expect(window.location.href).toBe(APP.LOGIN);
  });

  // The rule the request-interceptor cases already pin, on the branch that can
  // also navigate away: a dropped packet must not sign anyone out.
  it("should keep the session when the refresh fails for a transient reason", async () => {
    signIn(FRESH);
    mock.onGet("/title").reply(401);
    mock.onPost("/auth/refresh").reply(500);

    await expect(api.get("/title")).rejects.toThrow();

    expect(authStore.getState().token).toBe(FRESH);
    expect(window.location.href).toBe("");
  });

  it("should not retry the same request twice", async () => {
    signIn(FRESH);
    mock.onGet("/title").reply(401);
    mock.onPost("/auth/refresh").reply(200, { accessToken: FRESH, userId: "u1", role: Role.USER });

    await expect(api.get("/title")).rejects.toThrow();

    expect(mock.history.get).toHaveLength(2);
  });

  // Each concurrent 401 firing its own refresh would rotate the refresh cookie
  // N times and invalidate the winners.
  it("should coalesce concurrent refreshes into one call", async () => {
    signIn(FRESH);
    mock.onGet("/title").replyOnce(401).onGet("/title").reply(200, []);
    mock.onGet("/genre").replyOnce(401).onGet("/genre").reply(200, []);
    mock.onPost("/auth/refresh").reply(200, { accessToken: FRESH, userId: "u1", role: Role.USER });

    await Promise.all([api.get("/title"), api.get("/genre")]);

    expect(mock.history.post).toHaveLength(1);
  });
});
