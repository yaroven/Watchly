import { requireInProduction } from "./env.util";

describe("requireInProduction", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("should return the value when it is set, regardless of NODE_ENV", () => {
    process.env.NODE_ENV = "production";
    expect(requireInProduction("actual-value", "SOME_VAR", "dev-default")).toBe("actual-value");
  });

  describe("when NODE_ENV is production", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    test("should throw when the value is missing", () => {
      expect(() => requireInProduction(undefined, "SOME_VAR", "dev-default")).toThrow(
        "Missing required environment variable: SOME_VAR",
      );
    });

    test("should throw when the value is an empty string", () => {
      expect(() => requireInProduction("", "SOME_VAR", "dev-default")).toThrow(
        "Missing required environment variable: SOME_VAR",
      );
    });
  });

  describe("when NODE_ENV is not production", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    test("should fall back to the dev default when the value is missing", () => {
      expect(requireInProduction(undefined, "SOME_VAR", "dev-default")).toBe("dev-default");
    });
  });
});
