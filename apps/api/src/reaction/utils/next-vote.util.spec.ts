import { ReactionType } from "@prisma/client";
import { nextVote, voteDelta } from "./next-vote.util";

const { LIKE, DISLIKE } = ReactionType;

describe("nextVote", () => {
  it("withdraws the vote the viewer already holds", () => {
    expect(nextVote(LIKE, LIKE)).toBeNull();
    expect(nextVote(DISLIKE, DISLIKE)).toBeNull();
  });

  it("switches sides when the other vote is cast", () => {
    expect(nextVote(LIKE, DISLIKE)).toBe(DISLIKE);
    expect(nextVote(DISLIKE, LIKE)).toBe(LIKE);
  });

  it("sets the vote when the viewer holds none", () => {
    expect(nextVote(null, LIKE)).toBe(LIKE);
    expect(nextVote(null, DISLIKE)).toBe(DISLIKE);
  });
});

describe("voteDelta", () => {
  it("counts a new vote on its own side only", () => {
    expect(voteDelta(null, LIKE)).toEqual({ likes: 1, dislikes: 0 });
    expect(voteDelta(null, DISLIKE)).toEqual({ likes: 0, dislikes: 1 });
  });

  it("counts a withdrawal off the side it was held on", () => {
    expect(voteDelta(LIKE, null)).toEqual({ likes: -1, dislikes: 0 });
    expect(voteDelta(DISLIKE, null)).toEqual({ likes: 0, dislikes: -1 });
  });

  /** The case a single counter cannot express: switching sides moves both. */
  it("moves both counters when the vote switches sides", () => {
    expect(voteDelta(LIKE, DISLIKE)).toEqual({ likes: -1, dislikes: 1 });
    expect(voteDelta(DISLIKE, LIKE)).toEqual({ likes: 1, dislikes: -1 });
  });

  it("is zero when nothing moved", () => {
    expect(voteDelta(null, null)).toEqual({ likes: 0, dislikes: 0 });
    expect(voteDelta(LIKE, LIKE)).toEqual({ likes: 0, dislikes: 0 });
  });
});
