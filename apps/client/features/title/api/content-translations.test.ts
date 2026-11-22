import { episodeReads } from "@/features/episodes/api/episode.reads";
import { episodeTranslations } from "@/features/episodes/api/episode.translations";
import { genreReads } from "@/features/genre/api/genre.reads";
import { genreTranslations } from "@/features/genre/api/genre.translations";
import { seasonReads } from "@/features/season/api/season.reads";
import { seasonTranslations } from "@/features/season/api/season.translations";
import { titleEngagementReads } from "@/features/title-engagement/api/title-engagement.reads";
import type { TranslatableContent } from "@shared/api/content-translations";
import type { LocalizedRead } from "@shared/api/localized-query";
import type { ViewerKey } from "@shared/lib/use-viewer";
import { partialMatchKey } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { titleReads } from "./title.reads";
import { titleTranslations } from "./title.translations";

const VIEWER = "user-a" as string as ViewerKey;

const cases: [string, TranslatableContent<string>, string, LocalizedRead<unknown>[]][] = [
  ["title", titleTranslations, "t-1", [titleReads.detail("t-1"), titleReads.list(), titleEngagementReads.watchlist()]],
  ["season", seasonTranslations, "s-1", [seasonReads.detail("s-1"), seasonReads.list("t-1")]],
  ["episode", episodeTranslations, "e-1", [episodeReads.detail("e-1"), episodeReads.list("s-1")]],
  ["genre", genreTranslations, "g-1", [genreReads.list(), titleReads.detail("t-1"), titleEngagementReads.watchlist()]],
];

describe.each(cases)("a %s translation write", (_kind, content, id, reads) => {
  const copies = content.copies(id);
  const refreshes = (key: readonly unknown[]) => copies.some((prefix) => partialMatchKey(key, prefix));

  it("should refresh the stored translations", () => {
    expect(refreshes(content.translationsKey(id))).toBe(true);
  });

  it.each(["en", "uk"] as const)("should refresh every read that shows the translated text in %s", (locale) => {
    for (const read of reads) expect(refreshes(read.key({ locale, viewerKey: VIEWER }))).toBe(true);
  });

  it("should label every field it edits", () => {
    expect(content.fields.length).toBeGreaterThan(0);
    for (const field of content.fields) expect(field.maxLength).toBeGreaterThan(0);
  });
});
