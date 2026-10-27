import { ReactionType } from "@prisma/client";
import { arcOf, ReactionTarget, subjectIdOf } from "../reaction/utils/reaction-target.const";
import { Vote } from "../reaction/utils/vote.util";

export const VOTE_TTL_SECONDS = 7 * 24 * 60 * 60;

const NO_VOTE = "N";

const CODES: Record<ReactionType, string> = {
  [ReactionType.LIKE]: "L",
  [ReactionType.DISLIKE]: "D",
};

const VOTES: Record<string, Vote> = {
  [NO_VOTE]: null,
  ...Object.fromEntries(Object.entries(CODES).map(([vote, code]) => [code, vote as ReactionType])),
};

export const voteKey = (target: ReactionTarget, userId: string): string =>
  `vote:${arcOf(target)}:${subjectIdOf(target)}:${userId}`;

export const encodeVote = (vote: Vote): string => (vote ? CODES[vote] : NO_VOTE);

export const decodeVote = (raw: string | null): Vote | undefined =>
  raw !== null && raw in VOTES ? VOTES[raw] : undefined;

export type VoteOverrides = ReadonlyMap<string, Vote>;

export const NO_VOTE_OVERRIDES: VoteOverrides = new Map();
