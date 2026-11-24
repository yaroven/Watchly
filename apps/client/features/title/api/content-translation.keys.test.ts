import { episodeKeys } from "@/features/episodes/api/episode.keys";
import genreKeys from "@/features/genre/api/genre.keys";
import seasonKeys from "@/features/season/api/season.keys";
import titleKeys from "@/features/title/api/title.keys";
import type { ViewerKey } from "@shared/lib/use-viewer";
import { partialMatchKey } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

const VIEWER = "user-a" as string as ViewerKey;

describe("content translation query keys", () => {
  it.each([
    ["title", titleKeys.translations("t-1"), [titleKeys.all(), titleKeys.detailPrefix("t-1")]],
    ["season", seasonKeys.translations("s-1"), [seasonKeys.all(), seasonKeys.detailPrefix("s-1")]],
    ["episode", episodeKeys.translations("e-1"), [episodeKeys.all(), episodeKeys.detailPrefix("e-1")]],
    ["genre", genreKeys.translations("g-1"), [genreKeys.all(), genreKeys.detailPrefix("g-1")]],
  ])("a %s translation should be refreshed by its entity's prefixes", (_entity, key, prefixes) => {
    for (const prefix of prefixes) expect(partialMatchKey(key, prefix)).toBe(true);
  });

  it("should not share an entry with the entity's own detail read", () => {
    expect(partialMatchKey(titleKeys.detailFor("t-1", VIEWER, "en"), titleKeys.translations("t-1"))).toBe(false);
    expect(partialMatchKey(titleKeys.translations("t-1"), titleKeys.detailFor("t-1", VIEWER, "en"))).toBe(false);
    expect(partialMatchKey(seasonKeys.detailFor("s-1", "uk"), seasonKeys.translations("s-1"))).toBe(false);
  });

  it("should not let one entity's translations match another's", () => {
    expect(partialMatchKey(titleKeys.translations("t-2"), titleKeys.detailPrefix("t-1"))).toBe(false);
  });
});
