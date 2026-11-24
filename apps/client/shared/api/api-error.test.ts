import { describe, expect, it } from "vitest";
import { ApiError, describeApiError, SessionUnusableError } from "./api-error";

const t = (key: string) => `t:${key}`;

describe("describeApiError", () => {
  it("never shows the server's own text, which is English whatever the page language", () => {
    const error = new ApiError("Genre with name Drama already exists", 400, { message: "Genre with name Drama already exists" });

    expect(describeApiError(error, t)).toBe("t:badRequest");
  });

  it("prefers the caller's message for a status whose meaning it knows", () => {
    const error = new ApiError("Genre with name Drama already exists", 400);

    expect(describeApiError(error, t, { 400: "Жанр із такою назвою вже існує" })).toBe("Жанр із такою назвою вже існує");
  });

  it.each([
    [401, "t:unauthorized"],
    [403, "t:forbidden"],
    [404, "t:notFound"],
    [409, "t:conflict"],
    [413, "t:tooLarge"],
    [429, "t:rateLimited"],
    [500, "t:server"],
    [503, "t:server"],
    [418, "t:unexpected"],
  ])("should describe status %i", (status, expected) => {
    expect(describeApiError(new ApiError("x", status), t)).toBe(expected);
  });

  it("treats an error with no response as a network failure", () => {
    expect(describeApiError(new ApiError("timeout of 20000ms exceeded"), t)).toBe("t:network");
  });

  it("keeps the session message for an unusable session", () => {
    expect(describeApiError(new SessionUnusableError("refresh refused"), t)).toBe("t:sessionUnusable");
  });

  it("falls back to the generic message for anything that is not an API error", () => {
    expect(describeApiError(new Error("boom"), t)).toBe("t:unexpected");
    expect(describeApiError("boom", t)).toBe("t:unexpected");
  });
});
