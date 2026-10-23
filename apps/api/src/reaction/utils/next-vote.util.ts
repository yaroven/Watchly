import { ReactionType } from "@prisma/client";

/** A vote, or its absence. `null` is "holds no vote", never "unknown". */
export type Vote = ReactionType | null;

/**
 * The whole of the toggle: casting the vote you already hold withdraws it,
 * casting the other one switches sides, casting one you hold neither of sets it.
 *
 * Pure on purpose. Deciding the transition is the only part of reacting that is
 * a decision rather than a write, so it is the part worth pinning with a test
 * that needs neither Redis nor a database — and keeping it here is what lets
 * the cache stay thin enough to have nothing of its own to test.
 */
export const nextVote = (current: Vote, requested: ReactionType): Vote =>
  current === requested ? null : requested;

export interface VoteDelta {
  likes: number;
  dislikes: number;
}

/**
 * How the subject's two counters move across a transition.
 *
 * The counters a request can read are the ones the last flush left in Postgres,
 * which do not yet include the vote being cast. Adding this to them is what
 * makes the response agree with itself — `myReaction` and the count it is
 * supposed to explain — without making the caller wait for the flush.
 */
export const voteDelta = (previous: Vote, next: Vote): VoteDelta => ({
  likes: held(next, ReactionType.LIKE) - held(previous, ReactionType.LIKE),
  dislikes: held(next, ReactionType.DISLIKE) - held(previous, ReactionType.DISLIKE),
});

const held = (vote: Vote, type: ReactionType): number => (vote === type ? 1 : 0);
