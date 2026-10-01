import Role from "@/types/role";
import { authStore } from "@shared/lib/auth-store";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  authStore.getState().clear();
  authStore.getState().setStatus("resolved");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  mock.restore();
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
  it("should fall back to the token when the body carries a role it does not know", async () => {
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").reply(200, { accessToken: FRESH, userId: "u2", role: "superuser" });
    mock.onGet("/title").reply(200, []);

    await api.get("/title");

    expect(authStore.getState().role).toBe(Role.USER);
    expect(authStore.getState().userId).toBe("u1");
  });

  // Storing a token with no identity reports a signed-in viewer as anonymous
  // everywhere and keys their cache as such.
  it("should keep the existing session when the response carries no usable identity", async () => {
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").reply(200, { accessToken: "opaque-token" });
    mock.onGet("/title").reply(200, []);

    await api.get("/title");

    expect(authStore.getState().token).toBe(EXPIRED);
    expect(authStore.getState().userId).toBe("u1");
  });
});

describe("a clock this device cannot be trusted on", () => {
  // Every minted token reading as expired would otherwise mean a refresh per
  // request, forever, rotating the refresh cookie each time.
  it("should stop refreshing pre-emptively, but only for a while", async () => {
    signIn(EXPIRED);
    mock.onPost("/auth/refresh").reply(200, { accessToken: EXPIRED, userId: "u1", role: Role.USER });
    mock.onGet("/title").reply(200, []);

    await api.get("/title");
    await api.get("/title");

    expect(mock.history.post).toHaveLength(1);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Pausing pre-emptive token refresh"));
  });
});
