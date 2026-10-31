import { InternalServerErrorException } from "@nestjs/common";
import { settleAll, settleAllOrThrow } from "./settle-all-or-throw.util";

const context = { itemLabel: "item", parentLabel: "parent", parentId: "parent-1" };

describe("settleAllOrThrow", () => {
  it("should resolve without throwing when every item succeeds", async () => {
    const action = settleAllOrThrow(
      ["a", "b", "c"],
      async () => undefined,
      (item) => item,
      context,
    );

    await expect(action).resolves.toBeUndefined();
  });

  it("should run every item and throw once, naming only the failed ones", async () => {
    const ran: string[] = [];
    const action = settleAllOrThrow(
      ["a", "b", "c"],
      async (item) => {
        ran.push(item);
        if (item === "b") throw new Error("b failed");
      },
      (item) => item,
      context,
    );

    await expect(action).rejects.toThrow(InternalServerErrorException);
    await expect(action).rejects.toThrow("Failed to clean up 1 of 3 items for parent parent-1: b");
    expect(ran).toEqual(["a", "b", "c"]);
  });

  it("should never run more items concurrently than the configured limit", async () => {
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
      context,
      3,
    );

    expect(maxActive).toBeLessThanOrEqual(3);
  });
});

describe("settleAll", () => {
  it("should run every item and resolve even when every item fails", async () => {
    const ran: string[] = [];
    const action = settleAll(["a", "b"], async (item) => {
      ran.push(item);
      throw new Error("cleanup failed");
    });

    await expect(action).resolves.toBeUndefined();
    expect(ran).toEqual(["a", "b"]);
  });
});
