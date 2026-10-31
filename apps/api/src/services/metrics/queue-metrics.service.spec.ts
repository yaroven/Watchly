import { Test } from "@nestjs/testing";
import { Queue } from "bullmq";
import { Counter, register } from "prom-client";
import { METRICS_QUEUES, QueueMetricsService } from "./queue-metrics.service";

type FakeQueue = { name: string; getJobCounts: jest.Mock };

const unrelated = new Counter({ name: "probe_still_here_total", help: "probe" });

const queue = (name: string, counts: Record<string, number> | Error): FakeQueue => ({
  name,
  getJobCounts:
    counts instanceof Error
      ? jest.fn().mockRejectedValue(counts)
      : jest.fn().mockResolvedValue(counts),
});

async function build(queues: FakeQueue[]): Promise<void> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      QueueMetricsService,
      { provide: METRICS_QUEUES, useValue: queues as unknown as Queue[] },
    ],
  }).compile();

  moduleRef.get(QueueMetricsService);
}

describe("QueueMetricsService", () => {
  // Metrics live on the default registry, so values carry over between tests
  // unless they are cleared. Registrations stay.
  beforeEach(() => register.resetMetrics());

  it("samples every queue it was given, labelled by queue and state", async () => {
    await build([
      queue("video-transcode", { waiting: 4, active: 2, delayed: 0, failed: 1 }),
      queue("image-transcode", { waiting: 7, active: 1, delayed: 0, failed: 0 }),
    ]);

    const text = await register.metrics();

    expect(text).toContain('bullmq_queue_jobs{queue="video-transcode",state="waiting"} 4');
    expect(text).toContain('bullmq_queue_jobs{queue="video-transcode",state="failed"} 1');
    expect(text).toContain('bullmq_queue_jobs{queue="image-transcode",state="waiting"} 7');
  });

  // Reading Redis on every scrape is the point: a gauge kept in memory would
  // be one process's partial view and would reset on each rollout.
  it("reads the queue again on each scrape rather than caching", async () => {
    const video = queue("video-transcode", { waiting: 1, active: 0, delayed: 0, failed: 0 });
    await build([video]);

    await register.metrics();
    await register.metrics();

    expect(video.getJobCounts).toHaveBeenCalledTimes(2);
  });

  it("writes a zero for a state the queue did not report", async () => {
    await build([queue("video-transcode", { waiting: 3 })]);

    expect(await register.metrics()).toContain(
      'bullmq_queue_jobs{queue="video-transcode",state="active"} 0',
    );
  });

  // Building the service again replaces the queues rather than adding to them,
  // so a second instance does not sample the first one's queues too.
  it("replaces the queues it samples when built again", async () => {
    const first = queue("video-transcode", { waiting: 1 });
    await build([first]);
    await build([queue("image-transcode", { waiting: 2 })]);

    await register.metrics();

    expect(first.getJobCounts).not.toHaveBeenCalled();
  });

  /**
   * The one that matters. `register.metrics()` rejects as a whole if any
   * collector throws, so an unreachable Redis must not blank out every other
   * metric in the process — including the ones saying it is alive.
   */
  it("keeps the rest of the registry readable when a queue cannot be reached", async () => {
    unrelated.inc(1);
    await build([queue("video-transcode", new Error("ECONNREFUSED"))]);

    expect(await register.metrics()).toContain("probe_still_here_total 1");
  });
});
