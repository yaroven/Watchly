import { InternalServerErrorException, Logger } from "@nestjs/common";
import { settleAllOrLog, settleAllOrThrow } from "./settle-all-or-throw.util";

describe("settleAllOrThrow", () => {
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    logger = { error: jest.fn() } as unknown as jest.Mocked<Logger>;
  });

  test("should resolve without throwing when every item succeeds", async () => {
    const items = ["a", "b", "c"];
    const action = settleAllOrThrow(
      items,
      async () => undefined,
      (item) => item,
      logger,
      { itemLabel: "item", parentLabel: "parent", parentId: "parent-1" },
    );

    await expect(action).resolves.toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
  });

  test("should log each failure and throw once when some items fail", async () => {
    const items = ["a", "b", "c"];
    const action = settleAllOrThrow(
      items,
      async (item) => {
        if (item === "b") throw new Error("b failed");
      },
      (item) => item,
      logger,
      { itemLabel: "item", parentLabel: "parent", parentId: "parent-1" },
    );

    await expect(action).rejects.toThrow(InternalServerErrorException);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("item b"), expect.any(Error));
  });

  test("should never run more items concurrently than the configured limit", async () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    let active = 0;
    let maxActive = 0;

    await settleAllOrThrow(
      items,
      async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setImmediate(resolve));
        active--;
      },
      (item) => String(item),
      logger,
      { itemLabel: "item", parentLabel: "parent", parentId: "parent-1" },
      3,
    );

    expect(maxActive).toBeLessThanOrEqual(3);
  });
});

describe("settleAllOrLog", () => {
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    logger = { error: jest.fn() } as unknown as jest.Mocked<Logger>;
  });

  test("should resolve without throwing even when every item fails", async () => {
    const items = ["a", "b"];
    const action = settleAllOrLog(
      items,
      async () => {
        throw new Error("cleanup failed");
      },
      (item) => item,
      logger,
      { itemLabel: "asset", parentLabel: "parent", parentId: "parent-1" },
    );

    await expect(action).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(2);
  });

  test("should only log failed items, not successful ones", async () => {
    const items = ["a", "b", "c"];
    await settleAllOrLog(
      items,
      async (item) => {
        if (item === "b") throw new Error("boom");
      },
      (item) => item,
      logger,
      { itemLabel: "asset", parentLabel: "parent", parentId: "parent-1" },
    );

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("asset b"),
      expect.any(Error),
    );
  });
});
