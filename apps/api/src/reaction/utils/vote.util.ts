import { ReactionType } from "@prisma/client";

/**
 * A vote, or its absence. `null` is "holds no vote", never "unknown".
 *
 * A request names one of these outright — it does not ask for a toggle — so
 * nothing in the write path has to work out what the viewer held in order to
 * know what they want. That is what keeps a stale read from producing the wrong
 * answer: there is no decision for it to get wrong.
 */
export type Vote = ReactionType | null;

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

/**
 * Which answer about a viewer's vote wins.
 *
 * The cache is the truth, and `undefined` is it saying it has none — in which
 * case the `reactions` relation the read already loaded is the answer, free and
 * correct as of the last flush. Written out once because getting it backwards
 * is silent: preferring the relation renders a vote the viewer's next request
 * contradicts, and no test of a read path would notice.
 */
export const resolveVote = (cached: Vote | undefined, fromRow: Vote): Vote =>
  cached === undefined ? fromRow : cached;
