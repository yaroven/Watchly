import { ReactionType } from "@prisma/client";
import { arcOf, ReactionTarget, subjectIdOf } from "../reaction/utils/reaction-target.const";
import { Vote } from "../reaction/utils/vote.util";

export const VOTE_TTL_SECONDS = 7 * 24 * 60 * 60;

const CODES = { [ReactionType.LIKE]: "L", [ReactionType.DISLIKE]: "D" } as const;

const NO_VOTE = "N";

export const voteKey = (target: ReactionTarget, userId: string): string =>
  `vote:${arcOf(target)}:${subjectIdOf(target)}:${userId}`;

export const encodeVote = (vote: Vote): string => (vote ? CODES[vote] : NO_VOTE);

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

export type VoteOverrides = ReadonlyMap<string, Vote>;

export const NO_VOTE_OVERRIDES: VoteOverrides = new Map();
