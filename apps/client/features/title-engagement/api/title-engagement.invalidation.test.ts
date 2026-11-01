import commentKeys from "@/features/comment/api/comment.keys";
import titleKeys from "@/features/title/api/title.keys";
import type { ViewerKey } from "@shared/lib/use-viewer";
import { partialMatchKey } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { invalidateForTitle } from "./title-engagement.invalidation";
import titleEngagementKeys from "./title-engagement.keys";

const VIEWER = "user-a" as string as ViewerKey;
const TITLE = "title-1";
const OTHER = "title-2";

const invalidates = (key: readonly unknown[]) => invalidateForTitle(TITLE).some((prefix) => partialMatchKey(key, prefix));

describe("invalidateForTitle", () => {
  it.each([
    ["the title's engagement block", titleEngagementKeys.detail(TITLE, VIEWER)],
    ["every watchlist page", titleEngagementKeys.watchlist({ page: 2 }, VIEWER)],
    ["the title's detail", titleKeys.detailFor(TITLE, VIEWER)],
    ["every rail the title may sit in", titleKeys.listFor({ genreId: "g-1" } as never, VIEWER)],
    ["the comments under the title, which show the viewer's score", commentKeys.list(TITLE, "newest", 10, VIEWER)],
  ])("should refresh %s", (_what, key) => {
    expect(invalidates(key)).toBe(true);
  });

  it.each([
    ["the presigned playback URL", titleKeys.stream(TITLE)],
    ["the cast", titleKeys.cast(TITLE)],
    ["another title's detail", titleKeys.detailFor(OTHER, VIEWER)],
    ["another title's engagement", titleEngagementKeys.detail(OTHER, VIEWER)],
    ["another title's comments", commentKeys.list(OTHER, "newest", 10, VIEWER)],
    ["replies, which carry no score", commentKeys.reply("c-1", VIEWER)],
  ])("should leave %s alone", (_what, key) => {
    expect(invalidates(key)).toBe(false);
  });
});
