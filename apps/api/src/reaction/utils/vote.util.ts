import { ReactionType } from "@prisma/client";

export type Vote = ReactionType | null;

export interface VoteDelta {
  likes: number;
  dislikes: number;
}

export const voteDelta = (previous: Vote, next: Vote): VoteDelta => ({
  likes: held(next, ReactionType.LIKE) - held(previous, ReactionType.LIKE),
  dislikes: held(next, ReactionType.DISLIKE) - held(previous, ReactionType.DISLIKE),
});

const held = (vote: Vote, type: ReactionType): number => (vote === type ? 1 : 0);

export const resolveVote = (cached: Vote | undefined, fromRow: Vote): Vote =>
  cached === undefined ? fromRow : cached;
