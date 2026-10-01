import { describe, expect, it, vi } from "vitest";
import { decodeAccessToken, isAccessTokenExpired } from "./decode-jwt";

function tokenWith(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${body}.signature`;
}

describe("isAccessTokenExpired", () => {
  it("should be false for a token that is still valid", () => {
    expect(isAccessTokenExpired(tokenWith({ exp: Math.floor(Date.now() / 1000) + 3600 }))).toBe(false);
  });

  it("should be true once exp has passed", () => {
    expect(isAccessTokenExpired(tokenWith({ exp: Math.floor(Date.now() / 1000) - 1 }))).toBe(true);
  });

  it("should be true inside the skew window, so the token is replaced before it dies mid-flight", () => {
    expect(isAccessTokenExpired(tokenWith({ exp: Math.floor(Date.now() / 1000) + 5 }), 10)).toBe(true);
  });

  // The caller cannot fall back on the server noticing: @OptionalAuth() routes answer a
  // dead token with 200-anonymous, so an unreadable token would never be replaced.
  it("should treat an unreadable token as expired, and say so", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(isAccessTokenExpired("not-a-jwt")).toBe(true);
    expect(isAccessTokenExpired(tokenWith({ userId: "u1" }))).toBe(true);
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });
});

describe("decodeAccessToken", () => {
  it("should read the claims out of a well-formed token", () => {
    expect(decodeAccessToken(tokenWith({ userId: "user-1", role: "ADMIN" }))).toEqual({
      userId: "user-1",
      role: "ADMIN",
    });
  });

  it("should reject a role this client does not know rather than storing it", () => {
    expect(decodeAccessToken(tokenWith({ userId: "user-1", role: "superuser" }))).toBeNull();
  });

  it("should return null for junk instead of throwing", () => {
    expect(decodeAccessToken("")).toBeNull();
    expect(decodeAccessToken("a.b.c")).toBeNull();
  });
});
