import { episodeKeys } from "@/features/episodes/api/episode.keys";
import genreKeys from "@/features/genre/api/genre.keys";
import seasonKeys from "@/features/season/api/season.keys";
import titleKeys from "@/features/title/api/title.keys";
import type { ViewerKey } from "@shared/lib/use-viewer";
import { partialMatchKey } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

const VIEWER = "user-a" as string as ViewerKey;

describe("content locale in query keys", () => {
  it.each([
    ["a title write", titleKeys.detailPrefix("t-1"), (l: "en" | "uk") => titleKeys.detailFor("t-1", VIEWER, l)],
    ["a title write, on every list", titleKeys.all(), (l: "en" | "uk") => titleKeys.listFor({}, VIEWER, l)],
    ["a cast save", titleKeys.castPrefix("t-1"), (l: "en" | "uk") => titleKeys.castFor("t-1", l)],
    ["a season write", seasonKeys.all(), (l: "en" | "uk") => seasonKeys.listFor("t-1", l)],
    ["a season update", seasonKeys.detailPrefix("s-1"), (l: "en" | "uk") => seasonKeys.detailFor("s-1", l)],
    ["an episode write", episodeKeys.all(), (l: "en" | "uk") => episodeKeys.listFor("s-1", l)],
    ["an episode update", episodeKeys.detailPrefix("e-1"), (l: "en" | "uk") => episodeKeys.detailFor("e-1", l)],
    ["a genre write", genreKeys.all(), (l: "en" | "uk") => genreKeys.listFor({ limit: 100 }, l)],
  ])("%s should refresh the English and the Ukrainian query alike", (_what, prefix, keyIn) => {
    expect(partialMatchKey(keyIn("en"), prefix)).toBe(true);
    expect(partialMatchKey(keyIn("uk"), prefix)).toBe(true);
  });

  it("should keep the two languages in separate cache entries", () => {
    expect(titleKeys.detailFor("t-1", VIEWER, "en")).not.toEqual(titleKeys.detailFor("t-1", VIEWER, "uk"));
    expect(seasonKeys.listFor("t-1", "en")).not.toEqual(seasonKeys.listFor("t-1", "uk"));
    expect(genreKeys.listFor({}, "en")).not.toEqual(genreKeys.listFor({}, "uk"));
  });

  it("should not let one language's key match the other's", () => {
    expect(partialMatchKey(titleKeys.detailFor("t-1", VIEWER, "en"), titleKeys.detailFor("t-1", VIEWER, "uk"))).toBe(false);
  });
});
