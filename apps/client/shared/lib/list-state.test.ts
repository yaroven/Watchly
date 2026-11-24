import { describe, expect, it } from "vitest";
import { clampPage, lastPage, parseEnumValue } from "./list-state";

describe("clampPage", () => {
  it("moves back to the last page when a delete empties the page you were on", () => {
    expect(clampPage(3, 24, 12)).toBe(2);
  });

  it("keeps a page that still has items", () => {
    expect(clampPage(2, 25, 12)).toBe(2);
  });

  it("falls back to the first page for an empty list or a page that makes no sense", () => {
    expect(clampPage(4, 0, 12)).toBe(1);
    expect(clampPage(0, 30, 12)).toBe(1);
    expect(clampPage(Number.NaN, 30, 12)).toBe(1);
  });

  it("counts an empty list as one page", () => {
    expect(lastPage(0, 12)).toBe(1);
  });
});

describe("parseEnumValue", () => {
  it("accepts only the values the filter knows", () => {
    expect(parseEnumValue("MOVIE", ["MOVIE", "SERIES"] as const)).toBe("MOVIE");
    expect(parseEnumValue("movie'; DROP", ["MOVIE", "SERIES"] as const)).toBe("");
    expect(parseEnumValue(null, ["MOVIE"] as const)).toBe("");
  });
});
