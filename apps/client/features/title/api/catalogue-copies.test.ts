import artistKeys from "@/features/artist/api/artist.keys";
import commentKeys from "@/features/comment/api/comment.keys";
import { episodeKeys } from "@/features/episodes/api/episode.keys";
import genreKeys from "@/features/genre/api/genre.keys";
import seasonKeys from "@/features/season/api/season.keys";
import titleEngagementKeys from "@/features/title-engagement/api/title-engagement.keys";
import type { ViewerKey } from "@shared/lib/use-viewer";
import { partialMatchKey, type QueryKey } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { catalogueCopies, ownedBy } from "./catalogue-copies";
import titleKeys from "./title.keys";

const VIEWER = "user-a" as string as ViewerKey;
const TITLE = "title-1";
const OTHER = "title-2";

const covers = (prefixes: QueryKey[], key: QueryKey) => prefixes.some((prefix) => partialMatchKey(key, prefix));

describe("catalogueCopies.title", () => {
  const copies = catalogueCopies.title(TITLE);

  it.each([
    ["the title's detail, in either language", titleKeys.detailFor(TITLE, VIEWER, "uk")],
    ["the title's translations", titleKeys.translations(TITLE)],
    ["every rail the title may sit in", titleKeys.listFor({ genreId: "g-1" } as never, VIEWER, "uk")],
    ["every watchlist page, whose cards carry the title's name", titleEngagementKeys.watchlist({ page: 2 }, VIEWER, "en")],
  ])("should refresh %s", (_what, key) => {
    expect(covers(copies, key)).toBe(true);
  });

  it.each([
    ["another title's detail", titleKeys.detailFor(OTHER, VIEWER, "en")],
    ["the cast, which a title write does not touch", titleKeys.castFor(TITLE, "en")],
    ["the presigned playback URL", titleKeys.stream(TITLE)],
  ])("should leave %s alone", (_what, key) => {
    expect(covers(copies, key)).toBe(false);
  });
});

describe("catalogueCopies.titleEngagement", () => {
  const copies = catalogueCopies.titleEngagement(TITLE);

  it.each([
    ["the title's engagement block", titleEngagementKeys.detail(TITLE, VIEWER)],
    ["every watchlist page, in either language", titleEngagementKeys.watchlist({ page: 2 }, VIEWER, "uk")],
    ["the title's detail", titleKeys.detailFor(TITLE, VIEWER, "en")],
    ["the title's detail in Ukrainian", titleKeys.detailFor(TITLE, VIEWER, "uk")],
    ["every rail the title may sit in", titleKeys.listFor({ genreId: "g-1" } as never, VIEWER, "uk")],
    ["the comments under the title, which show the viewer's score", commentKeys.list(TITLE, "newest", 10, VIEWER)],
  ])("should refresh %s", (_what, key) => {
    expect(covers(copies, key)).toBe(true);
  });

  it.each([
    ["the presigned playback URL", titleKeys.stream(TITLE)],
    ["the cast", titleKeys.castPrefix(TITLE)],
    ["another title's detail", titleKeys.detailFor(OTHER, VIEWER, "en")],
    ["another title's engagement", titleEngagementKeys.detail(OTHER, VIEWER)],
    ["another title's comments", commentKeys.list(OTHER, "newest", 10, VIEWER)],
    ["replies, which carry no score", commentKeys.reply("c-1", VIEWER)],
  ])("should leave %s alone", (_what, key) => {
    expect(covers(copies, key)).toBe(false);
  });
});

describe("catalogueCopies.anyGenre", () => {
  const copies = catalogueCopies.anyGenre();

  it.each([
    ["the genre lists, in either language", genreKeys.listFor({ limit: 100 }, "uk")],
    ["a genre's translations", genreKeys.translations("g-1")],
    ["every title detail, which embeds its genres", titleKeys.detailFor(TITLE, VIEWER, "uk")],
    ["every title rail", titleKeys.listFor({}, VIEWER, "en")],
    ["every watchlist page, whose cards show genre names", titleEngagementKeys.watchlist({ page: 1 }, VIEWER, "uk")],
  ])("should refresh %s", (_what, key) => {
    expect(covers(copies, key)).toBe(true);
  });

  it("should leave the cast alone", () => {
    expect(covers(copies, titleKeys.castFor(TITLE, "en"))).toBe(false);
  });
});

describe("catalogueCopies.titleCast", () => {
  it("should refresh the cast in either language and nothing else", () => {
    const copies = catalogueCopies.titleCast(TITLE);
    expect(covers(copies, titleKeys.castFor(TITLE, "uk"))).toBe(true);
    expect(covers(copies, titleKeys.castFor(OTHER, "uk"))).toBe(false);
    expect(covers(copies, titleKeys.detailFor(TITLE, VIEWER, "en"))).toBe(false);
  });
});

describe("ownedBy.title", () => {
  it("should drop what only that title's page reads, and keep shared lists", () => {
    const owned = ownedBy.title(TITLE);
    expect(covers(owned, titleKeys.detailFor(TITLE, VIEWER, "en"))).toBe(true);
    expect(covers(owned, titleKeys.stream(TITLE))).toBe(true);
    expect(covers(owned, titleKeys.castFor(TITLE, "en"))).toBe(true);
    expect(covers(owned, titleKeys.listFor({}, VIEWER, "en"))).toBe(false);
  });
});

describe("catalogue copies between artists, casts and filmographies", () => {
  it("an artist write reaches every title's cast, which embeds the artist's name and photo", () => {
    expect(covers(catalogueCopies.artist("a-1"), titleKeys.castFor(TITLE, "uk"))).toBe(true);
    expect(covers(catalogueCopies.anyArtist(), titleKeys.castFor(OTHER, "en"))).toBe(true);
  });

  it("an artist write refreshes that artist only", () => {
    const copies = catalogueCopies.artist("a-1");
    expect(covers(copies, artistKeys.detail("a-1"))).toBe(true);
    expect(covers(copies, artistKeys.filmography("a-1"))).toBe(true);
    expect(covers(copies, artistKeys.detail("a-2"))).toBe(false);
  });

  it("a cast save reaches the filmographies, which list the title", () => {
    expect(covers(catalogueCopies.titleCast(TITLE), artistKeys.filmography("a-1"))).toBe(true);
    expect(covers(catalogueCopies.titleCast(TITLE), titleKeys.castFor(OTHER, "en"))).toBe(false);
  });

  it("a title rename reaches the filmographies, which show its name", () => {
    expect(covers(catalogueCopies.title(TITLE), artistKeys.filmography("a-1"))).toBe(true);
    expect(covers(catalogueCopies.anyTitle(), artistKeys.filmography("a-1"))).toBe(true);
  });
});

describe("catalogue copies of seasons and episodes", () => {
  it("a season write refreshes every season list and that season, in either language", () => {
    const copies = catalogueCopies.season("s-1");
    expect(covers(copies, seasonKeys.listFor("t-1", "uk"))).toBe(true);
    expect(covers(copies, seasonKeys.detailFor("s-1", "en"))).toBe(true);
    expect(covers(copies, seasonKeys.detailFor("s-2", "en"))).toBe(false);
  });

  it("an episode write refreshes every episode list and that episode", () => {
    const copies = catalogueCopies.episode("e-1");
    expect(covers(copies, episodeKeys.listFor("s-1", "uk"))).toBe(true);
    expect(covers(copies, episodeKeys.detailFor("e-1", "en"))).toBe(true);
    expect(covers(copies, episodeKeys.detailFor("e-2", "en"))).toBe(false);
  });
});
