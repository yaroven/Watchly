import { ExecutionContext, InternalServerErrorException, Logger } from "@nestjs/common";
import { readCurrentUserId, readOptionalUserId } from "./current-user-id.decorator";

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

describe("CurrentUserId", () => {
  afterEach(() => jest.restoreAllMocks());

  it("should return the viewer the guard attached", () => {
    expect(readCurrentUserId(contextFor({ userId: "user-1" }))).toBe("user-1");
  });

  it("should refuse to hand back an absent viewer, and log where it happened", () => {
    const error = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

    expect(() =>
      readCurrentUserId(contextFor({ method: "DELETE", url: "/titles/x/reaction" })),
    ).toThrow(InternalServerErrorException);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("DELETE /titles/x/reaction"));
  });

  it("should name the mispairing when the route turns out to be @OptionalAuth()", () => {
    const error = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

    expect(() =>
      readCurrentUserId(
        contextFor({ method: "GET", url: "/titles/x/rating", viewerScope: "optional" }),
      ),
    ).toThrow(InternalServerErrorException);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("@OptionalUserId()"));
  });

  it("should not leak the internal reason to the caller", () => {
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

    expect(() => readCurrentUserId(contextFor({ method: "GET", url: "/x" }))).toThrow(
      expect.objectContaining({ message: "Internal Server Error" }),
    );
  });
});

describe("OptionalUserId", () => {
  it("should return the viewer when there is one", () => {
    expect(readOptionalUserId(contextFor({ userId: "user-1" }))).toBe("user-1");
  });

  it("should return undefined for an anonymous caller rather than throwing", () => {
    expect(readOptionalUserId(contextFor({}))).toBeUndefined();
  });
});
