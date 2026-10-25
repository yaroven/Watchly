import { Injectable, Logger } from "@nestjs/common";
import { ReactionTarget, subjectIdOf } from "../reaction/utils/reaction-target.const";
import { Vote } from "../reaction/utils/vote.util";
import { throughRedis } from "../redis/redis.error";
import { RedisService } from "../redis/redis.service";
import {
  decodeVote,
  encodeVote,
  NO_VOTE_OVERRIDES,
  VOTE_TTL_SECONDS,
  voteKey,
  VoteOverrides,
} from "./vote-cache.const";

/**
 * Where a viewer's vote is decided. One key per (subject, viewer) pair, holding
 * that pair's vote and nothing else — no set of voters, no count. The count
 * stays in `EngagementCounters`, read as a relation the way it always was,
 * which is why this cache never has to be complete to be correct: it answers
 * about one viewer, so it can be built one viewer at a time.
 *
 * **A missing key is still not a vote of none.** `N` is a stored answer, an
 * absent key is "never asked", and the two stay distinguishable all the way
 * out. That mattered more when a toggle was decided from it, but it still
 * decides what a flush mirrors and what a page renders.
 *
 * Nothing here decides anything, in either direction. A request names the vote
 * it wants outright, so `set` writes it unconditionally; and no method reaches
 * into Postgres to cover for a miss, so "the cache does not know" reaches the
 * caller as `undefined` and stays its business. The three callers want three
 * different things from not knowing — a read falls back to the relation it
 * already loaded, a flush reads the row, a write wants it only to report a
 * count — and none of those belong to a cache.
 */
@Injectable()
export class VoteStateService {
  private readonly logger = new Logger(VoteStateService.name);

  constructor(private readonly redis: RedisService) {}

  /** What the cache holds for one pair, or `undefined` when it has no answer. */
  async get(target: ReactionTarget, userId: string): Promise<Vote | undefined> {
    return decodeVote(
      await throughRedis("read a vote", () => this.redis.get(voteKey(target, userId))),
    );
  }

  /**
   * What the cache knows about one viewer across a page of subjects, in one
   * `MGET`.
   *
   * A miss is left out instead of read from Postgres, which is the opposite of
   * what `read` does — and right here, because the caller is a read that has
   * *already* loaded the viewer's row as a relation. The row is a better
   * fallback than a query would be: it costs nothing and it is the same number
   * this endpoint served before the cache existed.
   *
   * This is also the one place a Redis failure is swallowed. The decision is
   * that reads degrade and writes refuse: a catalogue page that 503s because
   * the cache is being redeployed would be a worse trade than one whose
   * `myReaction` is a couple of seconds stale.
   */
  async readMany(targets: ReactionTarget[], userId: string): Promise<VoteOverrides> {
    if (targets.length === 0) return NO_VOTE_OVERRIDES;

    let raw: (string | null)[];
    try {
      raw = await this.redis.mget(targets.map((target) => voteKey(target, userId)));
    } catch (error) {
      this.logger.warn(
        `Reading votes from the cache failed; falling back to the rows: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return NO_VOTE_OVERRIDES;
    }

    const votes = new Map<string, Vote>();

    targets.forEach((target, index) => {
      const vote = decodeVote(raw[index] ?? null);
      if (vote !== undefined) votes.set(subjectIdOf(target), vote);
    });

    return votes;
  }

  /**
   * Writes the vote the viewer asked for, and answers with the one they held
   * before it.
   *
   * Unconditional: the value written does not depend on the value read, so
   * there is no read-decide-write for two clicks to race over — two absolute
   * writes just mean the later one wins, which is what it should mean. The
   * previous vote is wanted only to correct the counts in the response.
   *
   * One round trip in the warm case: `SET … GET` writes and returns the old
   * value together. A key that held nothing sends the row read after the
   * write, since by then the key already holds the new value and cannot say
   * what came before it.
   */
  async set(target: ReactionTarget, userId: string, vote: Vote): Promise<Vote | undefined> {
    return decodeVote(
      await throughRedis("write a vote", () =>
        this.redis.set(voteKey(target, userId), encodeVote(vote), "EX", VOTE_TTL_SECONDS, "GET"),
      ),
    );
  }
}
