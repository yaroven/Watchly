import { requireInProduction } from "./env.util";

describe("requireInProduction", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("should return the value when it is set", () => {
    it("regardless of NODE_ENV", () => {
      process.env.NODE_ENV = "production";
      expect(requireInProduction("actual-value", "SOME_VAR", "dev-default")).toBe("actual-value");
    });
  });

  describe("should throw", () => {
    it("if NODE_ENV is production and the value is missing", () => {
      process.env.NODE_ENV = "production";
      expect(() => requireInProduction(undefined, "SOME_VAR", "dev-default")).toThrow(
        "Missing required environment variable: SOME_VAR",
      );
    });

    it("if NODE_ENV is production and the value is an empty string", () => {
      process.env.NODE_ENV = "production";
      expect(() => requireInProduction("", "SOME_VAR", "dev-default")).toThrow(
        "Missing required environment variable: SOME_VAR",
      );
    });
  });

  describe("should fall back to the dev default", () => {
    it("if NODE_ENV is not production and the value is missing", () => {
      process.env.NODE_ENV = "development";
      expect(requireInProduction(undefined, "SOME_VAR", "dev-default")).toBe("dev-default");
    });
  });
});
