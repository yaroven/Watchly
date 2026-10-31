import { queueProducerConnectionOptions, redisConnectionOptions } from "./redis.config";

describe("queueProducerConnectionOptions", () => {
  const config = { host: "redis", port: 6380, password: "pw", tls: true };

  it("should keep the connection the rest of the app uses", () => {
    expect(queueProducerConnectionOptions(config)).toMatchObject(redisConnectionOptions(config));
  });

  it("should refuse a command at once while Redis is down, like RedisService", () => {
    expect(queueProducerConnectionOptions(config)).toMatchObject({
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
  });
});
