import { Test } from "@nestjs/testing";
import { Queue } from "bullmq";
import { Counter, Registry } from "prom-client";
import { METRICS_REGISTRY } from "./metrics.const";
import { METRICS_QUEUES, QueueMetricsService } from "./queue-metrics.service";

type FakeQueue = { name: string; getJobCounts: jest.Mock };

const queue = (name: string, counts: Record<string, number> | Error): FakeQueue => ({
  name,
  getJobCounts:
    counts instanceof Error
      ? jest.fn().mockRejectedValue(counts)
      : jest.fn().mockResolvedValue(counts),
});

async function build(queues: FakeQueue[]): Promise<Registry> {
  const registry = new Registry();

  const moduleRef = await Test.createTestingModule({
    providers: [
      QueueMetricsService,
      { provide: METRICS_REGISTRY, useValue: registry },
      { provide: METRICS_QUEUES, useValue: queues as unknown as Queue[] },
    ],
  }).compile();

  moduleRef.get(QueueMetricsService);

  return registry;
}

describe("QueueMetricsService", () => {
  it("samples every queue it was given, labelled by queue and state", async () => {
    const registry = await build([
      queue("video-transcode", { waiting: 4, active: 2, delayed: 0, failed: 1 }),
      queue("image-transcode", { waiting: 7, active: 1, delayed: 0, failed: 0 }),
    ]);

    const text = await registry.metrics();

    expect(text).toContain('bullmq_queue_jobs{queue="video-transcode",state="waiting"} 4');
    expect(text).toContain('bullmq_queue_jobs{queue="video-transcode",state="failed"} 1');
    expect(text).toContain('bullmq_queue_jobs{queue="image-transcode",state="waiting"} 7');
  });

  // Reading Redis on every scrape is the point: a gauge kept in memory would
  // be one process's partial view and would reset on each rollout.
  it("reads the queue again on each scrape rather than caching", async () => {
    const video = queue("video-transcode", { waiting: 1, active: 0, delayed: 0, failed: 0 });
    const registry = await build([video]);

    await registry.metrics();
    await registry.metrics();

    expect(video.getJobCounts).toHaveBeenCalledTimes(2);
  });

  it("writes a zero for a state the queue did not report", async () => {
    const registry = await build([queue("video-transcode", { waiting: 3 })]);

    const text = await registry.metrics();

    expect(text).toContain('bullmq_queue_jobs{queue="video-transcode",state="active"} 0');
  });

  /**
   * The one that matters. `registry.metrics()` rejects as a whole if any
   * collector throws, so an unreachable Redis must not blank out every other
   * metric in the process — including the ones saying it is alive.
   */
  it("keeps the rest of the registry readable when a queue cannot be reached", async () => {
    const registry = new Registry();
    new Counter({ name: "still_here_total", help: "unrelated", registers: [registry] }).inc(1);

    const moduleRef = await Test.createTestingModule({
      providers: [
        QueueMetricsService,
        { provide: METRICS_REGISTRY, useValue: registry },
        {
          provide: METRICS_QUEUES,
          useValue: [queue("video-transcode", new Error("ECONNREFUSED"))] as unknown as Queue[],
        },
      ],
    }).compile();
    moduleRef.get(QueueMetricsService);

    const text = await registry.metrics();

    expect(text).toContain("still_here_total 1");
  });
});
