import redisConfig from "./redis.config";

describe("redisConfig", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("when NODE_ENV is not production", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
    });

    test("should fall back to localhost defaults", () => {
      const config = redisConfig();
      expect(config.host).toBe("localhost");
      expect(config.port).toBe(6379);
    });
  });

  describe("when NODE_ENV is production", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    test("should throw if REDIS_HOST is missing", () => {
      delete process.env.REDIS_HOST;
      process.env.REDIS_PORT = "6379";
      expect(() => redisConfig()).toThrow("Missing required environment variable: REDIS_HOST");
    });

    test("should throw if REDIS_PORT is missing", () => {
      process.env.REDIS_HOST = "redis";
      delete process.env.REDIS_PORT;
      expect(() => redisConfig()).toThrow("Missing required environment variable: REDIS_PORT");
    });

    test("should return configured host and parsed port", () => {
      process.env.REDIS_HOST = "redis";
      process.env.REDIS_PORT = "6380";
      const config = redisConfig();
      expect(config.host).toBe("redis");
      expect(config.port).toBe(6380);
    });
  });
});
