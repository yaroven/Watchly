import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let request: { userId?: string };
  let context: ExecutionContext;

  beforeEach(() => {
    guard = new JwtAuthGuard();
    request = {};
    context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  });

  describe("handleRequest", () => {
    describe("should attach the user's id to request.userId and return the user", () => {
      it("on success", () => {
        const user = { id: "user-1", email: "user@example.com" };

        const result = guard.handleRequest(null, user, null, context);

        expect(result).toBe(user);
        expect(request.userId).toBe("user-1");
      });
    });

    describe("should throw UnauthorizedException and leave request.userId unset", () => {
      it("when there is no user (missing/expired/invalid token)", () => {
        expect(() =>
          guard.handleRequest(null, null, { message: "No auth token" }, context),
        ).toThrow(UnauthorizedException);
        expect(request.userId).toBeUndefined();
      });
    });

    describe("should rethrow a strategy-provided error instead of swallowing it", () => {
      it("when the strategy provides an error", () => {
        const strategyError = new Error("jwt malformed");

        expect(() => guard.handleRequest(strategyError, null, null, context)).toThrow(
          strategyError,
        );
        expect(request.userId).toBeUndefined();
      });
    });
  });
});
