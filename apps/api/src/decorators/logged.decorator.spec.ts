import { Logger, NotFoundException, SetMetadata } from "@nestjs/common";
import { Store, storage } from "nestjs-pino/storage";
import { Logged } from "./logged.decorator";

const DUMMY_KEY = "dummy:metadata";

class Subject {
  @Logged()
  async find(id: string): Promise<{ id: string; passwordHash: string }> {
    return { id, passwordHash: "secret-hash" };
  }

  @Logged({ action: "Removing a thing" })
  async remove(id: string): Promise<void> {
    throw new Error(`cannot remove ${id}`);
  }

  @Logged()
  async missing(): Promise<void> {
    throw new NotFoundException();
  }

  @Logged()
  async outer(id: string): Promise<void> {
    await this.remove(id);
  }

  @Logged()
  sum(a: number, b: number): number {
    return a + b;
  }

  @Logged({ completedLevel: "debug" })
  async hot(): Promise<number> {
    return 1;
  }

  @Logged({ failedLevel: "warn" })
  async expected(): Promise<void> {
    throw new Error("expected");
  }

  @Logged({
    failedLevel: (error) => (error instanceof RangeError ? "warn" : "error"),
  })
  async decided(fail: "range" | "type"): Promise<void> {
    throw fail === "range" ? new RangeError("range") : new TypeError("type");
  }

  @Logged({ data: (email: string) => ({ email }) })
  async signIn(email: string, password: string): Promise<void> {
    throw new Error(`no user ${email} with ${password.length} chars`);
  }

  @Logged()
  @SetMetadata(DUMMY_KEY, "kept")
  async tagged(): Promise<void> {}
}

function withDebug<T>(run: () => T): T {
  const logger = { isLevelEnabled: () => true } as unknown as Store["logger"];
  return storage.run(new Store(logger), run);
}

describe("Logged on a method", () => {
  let subject: Subject;
  const log = jest.mocked(Logger.prototype.log);
  const debug = jest.mocked(Logger.prototype.debug);
  const warn = jest.mocked(Logger.prototype.warn);
  const error = jest.mocked(Logger.prototype.error);

  beforeEach(() => {
    subject = new Subject();
    jest.clearAllMocks();
  });

  it("should log completion with duration but no data when debug is off", async () => {
    await expect(subject.find("t1")).resolves.toEqual({ id: "t1", passwordHash: "secret-hash" });

    expect(debug).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    const [entry] = log.mock.calls[0];
    expect(entry).toEqual({
      msg: "Subject.find completed",
      action: "Subject.find",
      ms: expect.any(Number),
    });
  });

  it("should log the arguments and the redacted result when debug is on", async () => {
    await withDebug(() => subject.find("t1"));

    expect(debug).toHaveBeenCalledWith(
      expect.objectContaining({ msg: "Subject.find started", data: ["t1"] }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ result: { id: "t1", passwordHash: "[Redacted]" } }),
    );
  });

  it("should log the failure with its arguments and rethrow the same error", async () => {
    const failure = subject.remove("t1");

    await expect(failure).rejects.toThrow("cannot remove t1");
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: "Removing a thing failed",
        err: expect.any(Error),
        data: ["t1"],
      }),
    );
    expect(log).not.toHaveBeenCalled();
  });

  it("should log only what the data option picks out of the arguments", async () => {
    await withDebug(() => subject.signIn("a@b.c", "hunter2").catch(() => undefined));

    for (const mock of [debug, error]) {
      expect(mock).toHaveBeenCalledWith(expect.objectContaining({ data: { email: "a@b.c" } }));
      expect(JSON.stringify(mock.mock.calls)).not.toContain("hunter2");
    }
  });

  it("should report a client error as a warning", async () => {
    await expect(subject.missing()).rejects.toThrow(NotFoundException);

    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ msg: "Subject.missing failed" }));
    expect(error).not.toHaveBeenCalled();
  });

  it("should report a failure at the configured level", async () => {
    await expect(subject.expected()).rejects.toThrow("expected");

    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ msg: "Subject.expected failed" }));
    expect(error).not.toHaveBeenCalled();
  });

  it("should let the error decide the level", async () => {
    await expect(subject.decided("range")).rejects.toThrow(RangeError);
    await expect(subject.decided("type")).rejects.toThrow(TypeError);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ err: expect.any(RangeError) }));
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ err: expect.any(TypeError) }));
  });

  it("should report an error once, at the innermost method", async () => {
    await expect(subject.outer("t1")).rejects.toThrow("cannot remove t1");

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ action: "Removing a thing" }));
    expect(debug).toHaveBeenCalledWith(expect.objectContaining({ msg: "Subject.outer failed" }));
  });

  it("should keep a synchronous method synchronous", () => {
    expect(subject.sum(2, 3)).toBe(5);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ msg: "Subject.sum completed" }));
  });

  it("should log completion at the configured level", async () => {
    await subject.hot();

    expect(log).not.toHaveBeenCalled();
    expect(debug).toHaveBeenCalledWith(expect.objectContaining({ msg: "Subject.hot completed" }));
  });

  it("should keep the metadata other decorators put on the method", () => {
    expect(Reflect.getMetadata(DUMMY_KEY, Subject.prototype.tagged)).toBe("kept");
  });
});
