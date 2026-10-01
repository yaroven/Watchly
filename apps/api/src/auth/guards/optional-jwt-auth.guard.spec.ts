import { ExecutionContext, Logger } from "@nestjs/common";
import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard";

describe("OptionalJwtAuthGuard", () => {
  let guard: OptionalJwtAuthGuard;
  let request: {
    userId?: string;
    role?: string;
    headers: Record<string, string>;
    method: string;
    url: string;
  };
  let context: ExecutionContext;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    guard = new OptionalJwtAuthGuard();
    request = { headers: {}, method: "GET", url: "/title" };
    context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    error = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it("should attach the viewer and return the user when the token is valid", () => {
    const user = { id: "user-1", role: "USER" };

    expect(guard.handleRequest(null, user, null, context)).toBe(user);
    expect(request.userId).toBe("user-1");
    expect(request.role).toBe("USER");
  });

  it("should continue anonymously and say nothing when no credential was presented", () => {
    expect(guard.handleRequest(null, null, { message: "No auth token" }, context)).toBeUndefined();
    expect(request.userId).toBeUndefined();
    // Anonymous page views are the normal case; logging them would bury the rest.
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  // The route is public: a 401 here reaches the client's refresh-then-redirect
  // path, so a dead refresh cookie would eject the viewer off a public page.
  it("should continue anonymously and warn when a presented token was rejected", () => {
    request.headers.authorization = "Bearer expired.token.here";

    expect(
      guard.handleRequest(
        null,
        null,
        { name: "TokenExpiredError", message: "jwt expired" },
        context,
      ),
    ).toBeUndefined();
    expect(request.userId).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("jwt expired"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("GET /title"));
  });

  // A failure inside the strategy degrades every signed-in read to anonymous —
  // an outage, not a routine rejection, so it must not land at the same severity.
  it("should continue anonymously and log an error when the strategy itself failed", () => {
    const failure = new Error("connection pool timeout");

    expect(guard.handleRequest(failure, null, null, context)).toBeUndefined();
    expect(request.userId).toBeUndefined();
    expect(error).toHaveBeenCalledWith(expect.stringContaining("GET /title"), failure.stack);
    expect(warn).not.toHaveBeenCalled();
  });

  it("should treat a strategy error as a failure even when passport also hands back a user", () => {
    const failure = new Error("boom");

    expect(
      guard.handleRequest(failure, { id: "user-1", role: "USER" }, null, context),
    ).toBeUndefined();
    expect(request.userId).toBeUndefined();
  });
});
