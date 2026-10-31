import { SetMetadata } from "@nestjs/common";
import { Job } from "bullmq";
import { storage, Store } from "nestjs-pino/storage";
import { setLogRoot } from "../common/utils/log-root.util";
import { JobContext } from "./job-context.decorator";

const DUMMY_KEY = "dummy:metadata";

class Processor {
  @JobContext()
  @SetMetadata(DUMMY_KEY, "kept")
  async process(job: Job): Promise<{ id: string | undefined; logger?: Store["logger"] }> {
    await Promise.resolve();
    return { id: job.id, logger: storage.getStore()?.logger };
  }
}

const job = { id: "42", name: "flush-vote", queueName: "reaction-flush" } as Job;

describe("JobContext", () => {
  afterEach(() => {
    setLogRoot(undefined);
  });

  it("should run the job under a logger bound to the job", async () => {
    const child = { name: "child" } as unknown as Store["logger"];
    const root = { child: jest.fn(() => child) };
    setLogRoot(root as unknown as Store["logger"]);

    const result = await new Processor().process(job);

    expect(root.child).toHaveBeenCalledWith({
      queue: "reaction-flush",
      jobId: "42",
      jobName: "flush-vote",
    });
    expect(result).toEqual({ id: "42", logger: child });
    expect(storage.getStore()).toBeUndefined();
  });

  it("should run the job untouched when no root logger exists", async () => {
    setLogRoot(undefined);

    await expect(new Processor().process(job)).resolves.toEqual({ id: "42", logger: undefined });
  });

  it("should keep the metadata other decorators put on the method", () => {
    expect(Reflect.getMetadata(DUMMY_KEY, Processor.prototype.process)).toBe("kept");
  });
});
