import { ReactionType } from "@prisma/client";
import { EngagementCounts } from "../engagement/engagement-counters.service";
import { ReactionTarget } from "./utils/reaction-target.const";
import { Vote } from "./utils/vote.util";

export type ReactionResult = EngagementCounts & { myReaction: Vote };

export interface Reactions {
  setVote(target: ReactionTarget, userId: string, type: ReactionType): Promise<ReactionResult>;
  clearVote(target: ReactionTarget, userId: string): Promise<ReactionResult>;
}

export const REACTIONS = Symbol("REACTIONS");
