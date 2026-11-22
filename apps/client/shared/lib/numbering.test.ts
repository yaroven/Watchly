import { describe, expect, it } from "vitest";
import { nextNumber } from "./numbering";

describe("nextNumber", () => {
  it("continues after the highest number, so a gap never hands out a taken one", () => {
    expect(nextNumber([{ number: 1 }, { number: 3 }])).toBe(4);
  });

  it("starts at one", () => {
    expect(nextNumber([])).toBe(1);
  });
});
