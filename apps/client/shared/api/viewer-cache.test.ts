import type { Query } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { ViewerKey } from "../lib/use-viewer";
import { forViewer } from "./viewer-cache";

const key = (viewerKey: string) => viewerKey as string as ViewerKey;

const USER_A = key("user-a");
const USER_B = key("user-b");
const ANONYMOUS = key("anonymous");

const LISTS_PREFIX = ["comment", "list"] as const;

/** Only `queryKey` is read, so a bare object stands in for the Query. */
const matches = (filters: ReturnType<typeof forViewer>, queryKey: readonly unknown[]): boolean =>
  filters.predicate!({ queryKey } as unknown as Query);

const listKey = (titleId: string, viewerKey: ViewerKey) =>
  ["comment", "list", titleId, { sort: "newest", limit: 10 }, { viewerKey }] as const;

describe("forViewer", () => {
  it("matches the acting viewer's entry under the prefix", () => {
    expect(matches(forViewer(LISTS_PREFIX, USER_A), listKey("title-1", USER_A))).toBe(true);
  });

  it("does not match another signed-in viewer's entry", () => {
    expect(matches(forViewer(LISTS_PREFIX, USER_A), listKey("title-1", USER_B))).toBe(false);
  });

  it("does not match the anonymous entry — the leak this exists to stop", () => {
    expect(matches(forViewer(LISTS_PREFIX, USER_A), listKey("title-1", ANONYMOUS))).toBe(false);
  });

  it("matches across the segments the writer does not know", () => {
    const otherSort = ["comment", "list", "title-1", { sort: "top", limit: 50 }, { viewerKey: USER_A }];

    expect(matches(forViewer(LISTS_PREFIX, USER_A), otherSort)).toBe(true);
  });

  it("does not match a key under a different prefix", () => {
    const replies = ["comment", "replies", "comment-1", { viewerKey: USER_A }];

    expect(matches(forViewer(LISTS_PREFIX, USER_A), replies)).toBe(false);
  });

  it("does not match a key that merely shares a first segment", () => {
    expect(matches(forViewer(LISTS_PREFIX, USER_A), ["comment"])).toBe(false);
  });

  it("does not match a key with no viewer rung", () => {
    const unscoped = ["comment", "list", "title-1", { sort: "newest", limit: 10 }];

    expect(matches(forViewer(LISTS_PREFIX, USER_A), unscoped)).toBe(false);
  });

  it("does not treat a non-string viewerKey as a match", () => {
    const malformed = ["comment", "list", "title-1", { viewerKey: 7 }];

    expect(matches(forViewer(LISTS_PREFIX, USER_A), malformed)).toBe(false);
  });

  it("lets an anonymous viewer write to the anonymous entry", () => {
    expect(matches(forViewer(LISTS_PREFIX, ANONYMOUS), listKey("title-1", ANONYMOUS))).toBe(true);
  });
});
