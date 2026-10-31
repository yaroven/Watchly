import { ReactionType } from "@prisma/client";
import { resolveVote, voteDelta } from "./vote.util";

const { LIKE, DISLIKE } = ReactionType;

describe("voteDelta", () => {
  it("counts a new vote on its own side only", () => {
    expect(voteDelta(null, LIKE)).toEqual({ likes: 1, dislikes: 0 });
    expect(voteDelta(null, DISLIKE)).toEqual({ likes: 0, dislikes: 1 });
  });

  it("counts a withdrawal off the side it was held on", () => {
    expect(voteDelta(LIKE, null)).toEqual({ likes: -1, dislikes: 0 });
    expect(voteDelta(DISLIKE, null)).toEqual({ likes: 0, dislikes: -1 });
  });

  it("moves both counters when the vote switches sides", () => {
    expect(voteDelta(LIKE, DISLIKE)).toEqual({ likes: -1, dislikes: 1 });
    expect(voteDelta(DISLIKE, LIKE)).toEqual({ likes: 1, dislikes: -1 });
  });

  it("is zero when nothing moved", () => {
    expect(voteDelta(null, null)).toEqual({ likes: 0, dislikes: 0 });
    expect(voteDelta(LIKE, LIKE)).toEqual({ likes: 0, dislikes: 0 });
  });
});

describe("resolveVote", () => {
  it("takes the cache's answer over the row", () => {
    expect(resolveVote(DISLIKE, LIKE)).toBe(DISLIKE);
  });

  it("takes a cached withdrawal over the row", () => {
    expect(resolveVote(null, LIKE)).toBeNull();
  });

  it("falls back to the row when the cache has no answer", () => {
    expect(resolveVote(undefined, LIKE)).toBe(LIKE);
    expect(resolveVote(undefined, null)).toBeNull();
  });
});
