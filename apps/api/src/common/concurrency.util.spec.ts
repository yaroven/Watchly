import { mapWithConcurrencyLimit } from "./concurrency.util";

describe("mapWithConcurrencyLimit", () => {
  test("should return results in the original item order", async () => {
    const items = [1, 2, 3, 4, 5];
    const result = await mapWithConcurrencyLimit(items, 2, async (n) => n * 2);
    expect(result).toEqual([2, 4, 6, 8, 10]);
  });

  test("should never run more than `limit` tasks concurrently", async () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    let active = 0;
    let maxActive = 0;

    await mapWithConcurrencyLimit(items, 3, async (n) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setImmediate(resolve));
      active--;
      return n;
    });

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  test("should propagate a rejection from any task", async () => {
    const items = [1, 2, 3];
    const action = mapWithConcurrencyLimit(items, 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    });

    await expect(action).rejects.toThrow("boom");
  });

  test("should handle an empty items array", async () => {
    const result = await mapWithConcurrencyLimit([], 5, async (n: number) => n);
    expect(result).toEqual([]);
  });
});
