import { ExecutionContext } from "@nestjs/common";
import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard";

describe("OptionalJwtAuthGuard", () => {
  let guard: OptionalJwtAuthGuard;
  let request: { userId?: string; role?: string; headers: Record<string, string> };
  let context: ExecutionContext;

  beforeEach(() => {
    guard = new OptionalJwtAuthGuard();
    request = { headers: {} };
    context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  });

  describe("should attach the viewer and return the user", () => {
    it("when the token is valid", () => {
      const user = { id: "user-1", role: "USER" };

      const result = guard.handleRequest(null, user, null, context);

      expect(result).toBe(user);
      expect(request.userId).toBe("user-1");
      expect(request.role).toBe("USER");
    });
  });

  describe("should continue anonymously and leave the viewer unset", () => {
    it("when no credential was presented", () => {
      const result = guard.handleRequest(null, null, { message: "No auth token" }, context);

      expect(result).toBeUndefined();
      expect(request.userId).toBeUndefined();
    });

    // The route is public. A 401 here reaches the client's refresh-then-redirect
    // path, so a dead refresh cookie would eject the viewer off a public page.
    it("when a presented token was rejected", () => {
      request.headers.authorization = "Bearer expired.token.here";

      const result = guard.handleRequest(
        null,
        null,
        { name: "TokenExpiredError", message: "jwt expired" },
        context,
      );

      expect(result).toBeUndefined();
      expect(request.userId).toBeUndefined();
    });

    it("when the strategy itself failed, rather than turning a public read into a 500", () => {
      request.headers.authorization = "Bearer whatever";

      const result = guard.handleRequest(new Error("connection pool timeout"), null, null, context);

      expect(result).toBeUndefined();
      expect(request.userId).toBeUndefined();
    });
  });
});
