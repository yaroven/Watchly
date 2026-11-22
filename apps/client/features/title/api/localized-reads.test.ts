import { episodeKeys } from "@/features/episodes/api/episode.keys";
import { episodeReads } from "@/features/episodes/api/episode.reads";
import EpisodeService from "@/features/episodes/api/episode.service";
import genreKeys from "@/features/genre/api/genre.keys";
import { genreReads } from "@/features/genre/api/genre.reads";
import genreService from "@/features/genre/api/genre.service";
import seasonKeys from "@/features/season/api/season.keys";
import { seasonReads } from "@/features/season/api/season.reads";
import SeasonService from "@/features/season/api/season.service";
import { titleEngagementReads } from "@/features/title-engagement/api/title-engagement.reads";
import titleEngagementService from "@/features/title-engagement/api/title-engagement.service";
import { localizedQuery, type LocalizedRead } from "@shared/api/localized-query";
import type { ContentLocale } from "@shared/lib/content-locale";
import type { ViewerKey } from "@shared/lib/use-viewer";
import { partialMatchKey, type QueryKey } from "@tanstack/react-query";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { catalogueCopies } from "./catalogue-copies";
import { titleReads } from "./title.reads";
import titleService from "./title.service";

const VIEWER = "user-a" as string as ViewerKey;
const LOCALES: ContentLocale[] = ["en", "uk"];

type ServiceSpy = MockInstance<(...args: never[]) => Promise<unknown>>;
type Case = [name: string, read: LocalizedRead<unknown>, spy: () => ServiceSpy, writePrefixes: QueryKey[]];

const cases: Case[] = [
  ["title detail", titleReads.detail("t-1"), () => vi.spyOn(titleService, "getById"), catalogueCopies.title("t-1")],
  ["title list", titleReads.list({ limit: 5 }), () => vi.spyOn(titleService, "getAll"), catalogueCopies.anyTitle()],
  ["title cast", titleReads.cast("t-1"), () => vi.spyOn(titleService, "getCast"), catalogueCopies.titleCast("t-1")],
  ["season detail", seasonReads.detail("s-1"), () => vi.spyOn(SeasonService, "getById"), [seasonKeys.detailPrefix("s-1")]],
  ["season list", seasonReads.list("t-1"), () => vi.spyOn(SeasonService, "getAll"), [seasonKeys.all()]],
  ["episode detail", episodeReads.detail("e-1"), () => vi.spyOn(EpisodeService, "getById"), [episodeKeys.detailPrefix("e-1")]],
  ["episode list", episodeReads.list("s-1"), () => vi.spyOn(EpisodeService, "getAll"), [episodeKeys.all()]],
  ["genre list", genreReads.list({ limit: 100 }), () => vi.spyOn(genreService, "getAll"), catalogueCopies.anyGenre()],
  [
    "watchlist",
    titleEngagementReads.watchlist({ page: 1 }),
    () => vi.spyOn(titleEngagementService, "getWatchlist"),
    catalogueCopies.titleEngagement("t-1"),
  ],
];

afterEach(() => vi.restoreAllMocks());

describe.each(cases)("the %s read", (_name, read, spy, writePrefixes) => {
  it.each(LOCALES)("should key and fetch in the same language (%s)", async (locale) => {
    const fetch = spy().mockResolvedValue(undefined as never);
    const query = localizedQuery(read, { locale, viewerKey: VIEWER });

    await query.queryFn();

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]).toContain(locale);
    expect(query.queryKey).toContainEqual(expect.objectContaining({ locale }));
  });

  it("should keep the two languages in separate cache entries", () => {
    const en = read.key({ locale: "en", viewerKey: VIEWER });
    const uk = read.key({ locale: "uk", viewerKey: VIEWER });
    expect(en).not.toEqual(uk);
    expect(partialMatchKey(en, uk)).toBe(false);
  });

  it.each(LOCALES)("should be refreshed by its writes in %s", (locale) => {
    const key = read.key({ locale, viewerKey: VIEWER });
    expect(writePrefixes.some((prefix) => partialMatchKey(key, prefix))).toBe(true);
  });
});

describe("viewer-dependent reads", () => {
  it.each([
    ["title detail", titleReads.detail("t-1")],
    ["title list", titleReads.list()],
    ["watchlist", titleEngagementReads.watchlist()],
  ])("should keep each viewer's %s apart", (_name, read) => {
    const a = read.key({ locale: "en", viewerKey: VIEWER });
    const b = read.key({ locale: "en", viewerKey: "user-b" as string as ViewerKey });
    expect(a).not.toEqual(b);
  });
});

describe("the genre list", () => {
  it("should not be confused with a translation read", () => {
    expect(partialMatchKey(genreReads.list().key({ locale: "uk", viewerKey: VIEWER }), genreKeys.translations("g-1"))).toBe(false);
  });
});
