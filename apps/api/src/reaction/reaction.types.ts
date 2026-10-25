import { ReactionType } from "@prisma/client";
import { EngagementCounts } from "../engagement/engagement-counters.service";
import { ReactionTarget } from "./utils/reaction-target.const";
import { Vote } from "./utils/vote.util";

export type ReactionResult = EngagementCounts & { myReaction: Vote };

/**
 * What a caster of votes can do, with no statement about where the vote goes.
 *
 * Two implementations answer to it: `ReactionService` writes the row and
 * recounts in one transaction, and `CachedReactionService` decides in Redis and
 * leaves the writing to a queue. The interface exists because the second
 * *wraps* the first and falls back to it when Redis is unreachable — and
 * because that makes the whole cache removable by pointing the token below at
 * the other one.
 */
export interface Reactions {
  assertSubjectExists(target: ReactionTarget): Promise<void>;
  setVote(target: ReactionTarget, userId: string, type: ReactionType): Promise<ReactionResult>;
  clearVote(target: ReactionTarget, userId: string): Promise<ReactionResult>;
}

/** Injected by the controller, so it never names which of the two it got. */
export const REACTIONS = Symbol("REACTIONS");
