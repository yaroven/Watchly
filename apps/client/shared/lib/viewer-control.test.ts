import { describe, expect, it } from "vitest";
import { nextVote, viewerControl } from "./viewer-control";

describe("viewerControl", () => {
  it.each([
    ["pending", { viewer: "pending", known: true }, { state: "pending", disabled: true, dimmed: false, intent: "ignore" }],
    ["pending, even if a stale value is cached", { viewer: "pending", known: false }, { state: "pending", intent: "ignore" }],
    ["anonymous", { viewer: "anonymous", known: false }, { state: "anonymous", disabled: false, dimmed: true, intent: "sign-in" }],
    ["anonymous while a write is in flight", { viewer: "anonymous", known: false, busy: true }, { intent: "sign-in" }],
    ["signed in, value unknown", { viewer: "signed-in", known: false }, { state: "unknown", disabled: true, dimmed: true }],
    ["signed in, refresh failed", { viewer: "signed-in", known: true, refreshFailed: true }, { state: "unknown", intent: "ignore" }],
    ["signed in and known", { viewer: "signed-in", known: true }, { state: "ready", disabled: false, dimmed: false, intent: "write" }],
    ["signed in and known, write in flight", { viewer: "signed-in", known: true, busy: true }, { state: "ready", disabled: true }],
  ] as const)("%s", (_case, input, expected) => {
    expect(viewerControl(input)).toMatchObject(expected);
  });
});

describe("nextVote", () => {
  it("withdraws the vote the viewer already holds", () => expect(nextVote("LIKE", "LIKE")).toBeNull());
  it("switches sides", () => expect(nextVote("DISLIKE", "LIKE")).toBe("LIKE"));
  it("casts a first vote", () => expect(nextVote(null, "LIKE")).toBe("LIKE"));
});
