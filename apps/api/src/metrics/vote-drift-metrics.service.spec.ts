import { Test } from "@nestjs/testing";
import { register } from "prom-client";
import { RedisService } from "../redis/redis.service";
import { VoteDriftMetricsService } from "./vote-drift-metrics.service";

const METRIC = "reaction_counter_drift_subjects";

const scrape = async (): Promise<{ labels: { arc?: string }; value: number }[]> => {
  const metrics = await register.getMetricsAsJSON();
  const found = metrics.find((metric) => metric.name === METRIC);

  return (found?.values ?? []) as { labels: { arc?: string }; value: number }[];
};

describe("VoteDriftMetricsService", () => {
  let redis: { mget: jest.Mock };

  beforeEach(async () => {
    register.resetMetrics();
    redis = { mget: jest.fn().mockResolvedValue([null, null]) };

    await Test.createTestingModule({
      providers: [VoteDriftMetricsService, { provide: RedisService, useValue: redis }],
    }).compile();
  });

  afterEach(() => jest.clearAllMocks());

  it("reads both arcs' drift in one call", async () => {
    await scrape();

    expect(redis.mget).toHaveBeenCalledWith(["reactions:drift:title", "reactions:drift:comment"]);
  });

  it("reports what the last reconciliation repaired", async () => {
    redis.mget.mockResolvedValue(["4", "0"]);

    expect(await scrape()).toEqual([
      { labels: { arc: "title" }, value: 4 },
      { labels: { arc: "comment" }, value: 0 },
    ]);
  });

  it("reports nothing at all before a reconciliation has run", async () => {
    expect(await scrape()).toEqual([]);
  });

  it("skips an arc that has not been reconciled, keeping the one that has", async () => {
    redis.mget.mockResolvedValue(["2", null]);

    expect(await scrape()).toEqual([{ labels: { arc: "title" }, value: 2 }]);
  });

  it("does not fail the scrape when redis is unreachable", async () => {
    redis.mget.mockRejectedValue(new Error("redis is down"));

    await expect(register.getMetricsAsJSON()).resolves.toBeDefined();
  });
});
