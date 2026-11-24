import { describe, expect, it } from "vitest";
import { hasMorePages, mergePages } from "./paged-read";

const item = (id: string) => ({ id });

describe("mergePages", () => {
  it("joins pages in order and drops an item a shifting list repeated", () => {
    expect(
      mergePages([
        { items: [item("a"), item("b")], totalCount: 4 },
        { items: [item("b"), item("c")], totalCount: 4 },
      ]),
    ).toEqual({
      items: [item("a"), item("b"), item("c")],
      totalCount: 4,
    });
  });

  it("stops at the first page still loading, so the list never has a hole", () => {
    expect(mergePages([{ items: [item("a")], totalCount: 3 }, undefined, { items: [item("c")], totalCount: 3 }]).items).toEqual([
      item("a"),
    ]);
  });
});

describe("hasMorePages", () => {
  it("decides the end from the total, not from the size of the last page", () => {
    expect(hasMorePages(60, 61)).toBe(true);
    expect(hasMorePages(61, 61)).toBe(false);
  });
});
