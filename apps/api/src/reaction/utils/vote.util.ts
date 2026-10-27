import { ReactionType } from "@prisma/client";
import {
  counterOf,
  ReactionCounter,
  zeroCounters,
} from "../../engagement/engagement-counters.service";

export type Vote = ReactionType | null;

export type VoteDelta = Record<ReactionCounter, number>;

export const voteDelta = (previous: Vote, next: Vote): VoteDelta => {
  const delta = zeroCounters();

  if (previous) delta[counterOf(previous)] -= 1;
  if (next) delta[counterOf(next)] += 1;

  return delta;
};

export const resolveVote = (cached: Vote | undefined, fromRow: Vote): Vote =>
  cached === undefined ? fromRow : cached;
