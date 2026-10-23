import { Injectable, Logger } from "@nestjs/common";
import { ReactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { nextVote, Vote } from "../reaction/utils/next-vote.util";
import {
  ReactionTarget,
  reactionWhereUnique,
  subjectIdOf,
} from "../reaction/utils/reaction-target.const";
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

export interface VoteTransition {
  previous: Vote;
  next: Vote;
}

/**
 * Where a viewer's vote is decided. One key per (subject, viewer) pair, holding
 * that pair's vote and nothing else — no set of voters, no count. The count
 * stays in `EngagementCounters`, read as a relation the way it always was,
 * which is why this cache never has to be complete to be correct: it answers
 * about one viewer, so it can be built one viewer at a time.
 *
 * **A missing key is not a vote of none.** Deciding a toggle from "nothing
 * here" would mean that the first click after any Redis restart re-casts the
 * vote the viewer was trying to withdraw, answers 200, and changes nothing. So
 * a miss reads the row, and what it finds — including "no row" — is written
 * back, because `N` is a stored answer rather than an absent one.
 *
 * The read-then-write in `transition` is not atomic, and deliberately: the only
 * racers are one viewer against themselves on one subject, the flush mirrors
 * whatever Redis ends up holding, and so the worst outcome is that one of two
 * clicks milliseconds apart does not count. A Lua script would close that at
 * the cost of moving the transition out of `nextVote`, where a test can reach
 * it without a server.
 */
@Injectable()
export class VoteStateService {
  private readonly logger = new Logger(VoteStateService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /** The viewer's vote: from the cache when it has an answer, from the row when it doesn't. */
  async read(target: ReactionTarget, userId: string): Promise<Vote> {
    const cached = decodeVote(
      await throughRedis("read a vote", () => this.redis.get(voteKey(target, userId))),
    );

    return cached === undefined ? this.hydrate(target, userId) : cached;
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
   * Casts `requested` through the toggle and leaves the result in the cache.
   * `null` is a withdrawal — the DELETE route, which is not a toggle and does
   * not care what was held.
   */
  async transition(
    target: ReactionTarget,
    userId: string,
    requested: ReactionType | null,
  ): Promise<VoteTransition> {
    const previous = await this.read(target, userId);
    const next = requested === null ? null : nextVote(previous, requested);

    await this.write(target, userId, next);

    return { previous, next };
  }

  private async write(target: ReactionTarget, userId: string, vote: Vote): Promise<void> {
    await throughRedis("write a vote", () =>
      this.redis.set(voteKey(target, userId), encodeVote(vote), "EX", VOTE_TTL_SECONDS),
    );
  }

  private async hydrate(target: ReactionTarget, userId: string): Promise<Vote> {
    const row = await this.prisma.reaction.findUnique({
      where: reactionWhereUnique(target, userId),
      select: { type: true },
    });
    const vote = row?.type ?? null;

    await this.write(target, userId, vote);

    return vote;
  }
}
