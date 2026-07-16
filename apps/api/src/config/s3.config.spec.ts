import s3Config from "./s3.config";

describe("s3Config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("when NODE_ENV is not production", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      delete process.env.S3_ACCESS_KEY_ID;
      delete process.env.S3_SECRET_ACCESS_KEY;
    });

    test("should fall back to localstack credentials", () => {
      const config = s3Config();
      expect(config.accessKeyId).toBe("localstack");
      expect(config.secretAccessKey).toBe("localstack");
    });
  });

  describe("when NODE_ENV is production", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    test("should throw if S3_ACCESS_KEY_ID is missing", () => {
      process.env.S3_ACCESS_KEY_ID = "";
      process.env.S3_SECRET_ACCESS_KEY = "secret";
      expect(() => s3Config()).toThrow("Missing required environment variable: S3_ACCESS_KEY_ID");
    });

    test("should throw if S3_SECRET_ACCESS_KEY is missing", () => {
      process.env.S3_ACCESS_KEY_ID = "key";
      process.env.S3_SECRET_ACCESS_KEY = "";
      expect(() => s3Config()).toThrow(
        "Missing required environment variable: S3_SECRET_ACCESS_KEY",
      );
    });

    test("should not throw when both credentials are set", () => {
      process.env.S3_ACCESS_KEY_ID = "key";
      process.env.S3_SECRET_ACCESS_KEY = "secret";
      expect(() => s3Config()).not.toThrow();
    });
  });
});
