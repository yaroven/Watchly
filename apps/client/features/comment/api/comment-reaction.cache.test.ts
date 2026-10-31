import { describe, expect, it } from "vitest";
import { Comment, CommentReaction, ReactionType } from "../schemas/comment";
import { InfiniteComments, withReactionInList, withReactionInReplies } from "./comment-reaction.cache";

const comment = (id: string, replies: Comment[] = []): Comment => ({
  id,
  author: { id: "author", name: "author", avatarUrl: null, score: null },
  text: id,
  hasSpoiler: false,
  createdAt: new Date(0),
  likes: 0,
  dislikes: 0,
  myReaction: null,
  replies,
  replyCount: replies.length,
});

const LIKED: CommentReaction = { likes: 5, dislikes: 1, myReaction: ReactionType.LIKE };

const list = (...items: Comment[]): InfiniteComments => ({
  pages: [{ items, totalCount: items.length }],
  pageParams: [1],
});

describe("withReactionInList", () => {
  it("should apply the result to the comment that was voted on", () => {
    const next = withReactionInList(list(comment("a"), comment("b")), "b", LIKED)!;

    expect(next.pages[0].items[1]).toMatchObject(LIKED);
    expect(next.pages[0].items[0]).toMatchObject({ likes: 0, myReaction: null });
  });

  it("should reach a reply inside its parent", () => {
    const next = withReactionInList(list(comment("a", [comment("r1"), comment("r2")])), "r2", LIKED)!;
    const [reply1, reply2] = next.pages[0].items[0].replies;

    expect(reply2).toMatchObject(LIKED);
    expect(reply1).toMatchObject({ likes: 0, myReaction: null });
    expect(next.pages[0].items[0]).toMatchObject({ likes: 0, myReaction: null });
  });

  it("should not copy a comment the vote does not touch", () => {
    const untouched = comment("a");

    const next = withReactionInList(list(untouched, comment("b")), "b", LIKED)!;

    expect(next.pages[0].items[0]).toBe(untouched);
  });

  it("should leave an entry that is not loaded as it is", () => {
    expect(withReactionInList(undefined, "a", LIKED)).toBeUndefined();
  });
});

describe("withReactionInReplies", () => {
  it("should apply the result to the reply that was voted on", () => {
    const page = { items: [comment("r1"), comment("r2")], totalCount: 2 };

    const next = withReactionInReplies(page, "r1", LIKED)!;

    expect(next.items[0]).toMatchObject(LIKED);
    expect(next.items[1]).toMatchObject({ likes: 0, myReaction: null });
  });

  it("should leave an entry that is not loaded as it is", () => {
    expect(withReactionInReplies(undefined, "r1", LIKED)).toBeUndefined();
  });
});
