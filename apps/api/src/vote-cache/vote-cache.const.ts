import { ReactionType } from "@prisma/client";
import { Vote } from "../reaction/utils/next-vote.util";
import { arcOf, ReactionTarget, subjectIdOf } from "../reaction/utils/reaction-target.const";

/**
 * A week.
 *
 * Not a memory budget — a key is about a hundred bytes and there are as many as
 * there are votes. It is the upper bound on how long a disagreement between
 * this cache and the rows can survive: an expired key is read back from
 * Postgres, so any drift nobody noticed heals on its own inside the window.
 */
export const VOTE_TTL_SECONDS = 7 * 24 * 60 * 60;

const CODES = { [ReactionType.LIKE]: "L", [ReactionType.DISLIKE]: "D" } as const;

/**
 * Stored rather than left as a missing key, because "holds no vote" and "this
 * cache has never been asked" must not look the same. A missing key sends the
 * caller to Postgres; this one answers.
 */
const NO_VOTE = "N";

export const voteKey = (target: ReactionTarget, userId: string): string =>
  `vote:${arcOf(target)}:${subjectIdOf(target)}:${userId}`;

export const encodeVote = (vote: Vote): string => (vote ? CODES[vote] : NO_VOTE);

/**
 * `undefined` means "no answer here" — a missing key, or a value this code did
 * not write. Both send the caller to the row rather than collapsing into one of
 * the two real answers, since trusting a garbled value would mean casting a
 * vote on a transition computed from it.
 */
export const decodeVote = (raw: string | null): Vote | undefined => {
  switch (raw) {
    case NO_VOTE:
      return null;
    case CODES[ReactionType.LIKE]:
      return ReactionType.LIKE;
    case CODES[ReactionType.DISLIKE]:
      return ReactionType.DISLIKE;
    default:
      return undefined;
  }
};

/**
 * What the cache knows about one viewer across a page of subjects, keyed by
 * subject id. A pair the cache had no answer for is **absent** rather than
 * `null`, which is the distinction the whole thing turns on: `Map.get` yields
 * `undefined` for it, and the caller falls back to the row it already loaded.
 * A stored `N` lands as a present `null` and wins over that row.
 */
export type VoteOverrides = ReadonlyMap<string, Vote>;

export const NO_VOTE_OVERRIDES: VoteOverrides = new Map();
