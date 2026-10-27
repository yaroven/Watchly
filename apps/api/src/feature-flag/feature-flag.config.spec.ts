import featureFlagConfig, { envVarOf, parseFlag } from "./feature-flag.config";

describe("feature flag config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("parseFlag", () => {
    it.each([
      ["true", true],
      ["false", false],
    ])("should read %s literally", (value, expected) => {
      expect(parseFlag(value, "FF_X", !expected)).toBe(expected);
    });

    it.each([undefined, ""])("should fall back to the default when unset (%p)", (value) => {
      expect(parseFlag(value, "FF_X", true)).toBe(true);
      expect(parseFlag(value, "FF_X", false)).toBe(false);
    });

    it.each(["1", "0", "on", "off", "TRUE", "yes"])("should refuse %s", (value) => {
      expect(() => parseFlag(value, "FF_X", true)).toThrow('FF_X must be "true" or "false"');
    });
  });

  it("should name the env var after the flag", () => {
    expect(envVarOf("reactions")).toBe("FF_REACTIONS");
  });

  it("should default reactions to on so a deployment without the var keeps them", () => {
    delete process.env.FF_REACTIONS;
    expect(featureFlagConfig()).toEqual({ reactions: true });
  });

  it("should turn reactions off from the env", () => {
    process.env.FF_REACTIONS = "false";
    expect(featureFlagConfig()).toEqual({ reactions: false });
  });
});
