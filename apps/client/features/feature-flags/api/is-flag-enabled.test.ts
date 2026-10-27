import { describe, expect, it } from "vitest";
import { isFlagEnabled } from "./is-flag-enabled";

describe("isFlagEnabled", () => {
  it("is off until the snapshot has arrived", () => {
    expect(isFlagEnabled({ data: undefined, isError: false }, "reactions")).toBe(false);
  });

  it("reads the flag the api answered", () => {
    expect(isFlagEnabled({ data: { reactions: true }, isError: false }, "reactions")).toBe(true);
    expect(isFlagEnabled({ data: { reactions: false }, isError: false }, "reactions")).toBe(false);
  });

  it("is off on a failed fetch", () => {
    expect(isFlagEnabled({ data: undefined, isError: true }, "reactions")).toBe(false);
  });

  it("is off when a stale refetch errors with data still held", () => {
    expect(isFlagEnabled({ data: { reactions: true }, isError: true }, "reactions")).toBe(false);
  });

  it("is off for a key an older api does not send", () => {
    expect(isFlagEnabled({ data: {}, isError: false }, "reactions")).toBe(false);
  });
});
