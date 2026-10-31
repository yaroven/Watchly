import { INestApplicationContext, Injectable } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Job } from "bullmq";
import { Logger, LoggerModule } from "nestjs-pino";
import { __resetOutOfContextForTests } from "nestjs-pino/PinoLogger";
import { Writable } from "stream";
import { LogRootService } from "../services/logging/log-root.service";
import { JobContext } from "./job-context.decorator";
import { Logged } from "./logged.decorator";

@Injectable()
class Accounts {
  @Logged()
  async find(id: string): Promise<{ id: string; password: string }> {
    return { id, password: "hunter2" };
  }

  @Logged()
  async fail(id: string): Promise<void> {
    throw new Error(`no account ${id}`);
  }

  @JobContext()
  @Logged()
  async process(job: Job): Promise<void> {
    await this.find(job.data as string);
  }
}

async function boot(
  level: string,
): Promise<{ app: INestApplicationContext; lines: Record<string, unknown>[] }> {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      done();
    },
  });

  const moduleRef = await Test.createTestingModule({
    imports: [LoggerModule.forRoot({ pinoHttp: [{ level }, stream] })],
    providers: [LogRootService, Accounts],
  }).compile();

  const app = await moduleRef.init();
  app.useLogger(app.get(Logger));
  return { app, lines };
}

describe("Logged through nestjs-pino", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    __resetOutOfContextForTests();
  });

  it("should write the message, the context and the duration at info", async () => {
    const { app, lines } = await boot("info");

    await app.get(Accounts).find("a1");

    expect(lines).toEqual([
      expect.objectContaining({
        level: 30,
        msg: "Accounts.find completed",
        context: "Accounts",
        action: "Accounts.find",
        ms: expect.any(Number),
      }),
    ]);
    expect(lines[0]).not.toHaveProperty("result");
    await app.close();
  });

  it("should add the arguments and the redacted result at debug", async () => {
    const { app, lines } = await boot("debug");

    await app.get(Accounts).find("a1");

    expect(lines).toEqual([
      expect.objectContaining({ level: 20, msg: "Accounts.find started", data: ["a1"] }),
      expect.objectContaining({
        level: 30,
        msg: "Accounts.find completed",
        result: { id: "a1", password: "[Redacted]" },
      }),
    ]);
    await app.close();
  });

  it("should write a failure with its stack and arguments", async () => {
    const { app, lines } = await boot("info");

    await expect(app.get(Accounts).fail("a1")).rejects.toThrow("no account a1");

    expect(lines).toEqual([
      expect.objectContaining({
        level: 50,
        msg: "Accounts.fail failed",
        data: ["a1"],
        err: expect.objectContaining({ message: "no account a1", stack: expect.any(String) }),
      }),
    ]);
    await app.close();
  });

  it("should bind every line written during a job to that job", async () => {
    const { app, lines } = await boot("info");
    const job = { id: "7", name: "sync", queueName: "accounts", data: "a1" } as Job;

    await app.get(Accounts).process(job);

    expect(lines.map((line) => line.msg)).toEqual([
      "Accounts.find completed",
      "Accounts.process completed",
    ]);
    for (const line of lines) {
      expect(line).toEqual(
        expect.objectContaining({ queue: "accounts", jobId: "7", jobName: "sync" }),
      );
    }
    await app.close();
  });
});
