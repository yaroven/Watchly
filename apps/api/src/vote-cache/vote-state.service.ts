import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  ReactionTarget,
  reactionWhereUnique,
  subjectIdOf,
} from "../reaction/utils/reaction-target.const";
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
 * **A missing key is still not a vote of none.** `N` is a stored answer and an
 * absent key is "never asked"; `read` turns the second into the first by going
 * to the row. That mattered more when a toggle was decided from it, but it
 * still decides what a flush mirrors and what a page renders.
 *
 * Nothing here decides anything. A request names the vote it wants outright,
 * so `set` writes it unconditionally — there is no transition to compute, and
 * therefore no stale read that could compute one wrongly. The hydration below
 * exists for the counts in the response, not for correctness.
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
  async set(target: ReactionTarget, userId: string, vote: Vote): Promise<Vote> {
    const previous = await throughRedis("write a vote", () =>
      this.redis.set(voteKey(target, userId), encodeVote(vote), "EX", VOTE_TTL_SECONDS, "GET"),
    );
    const decoded = decodeVote(previous);

    return decoded === undefined ? this.rowVote(target, userId) : decoded;
  }

  private async write(target: ReactionTarget, userId: string, vote: Vote): Promise<void> {
    await throughRedis("write a vote", () =>
      this.redis.set(voteKey(target, userId), encodeVote(vote), "EX", VOTE_TTL_SECONDS),
    );
  }

  /** The last flushed vote. The row is the only place that knows it. */
  private async rowVote(target: ReactionTarget, userId: string): Promise<Vote> {
    const row = await this.prisma.reaction.findUnique({
      where: reactionWhereUnique(target, userId),
      select: { type: true },
    });

    return row?.type ?? null;
  }

  private async hydrate(target: ReactionTarget, userId: string): Promise<Vote> {
    const vote = await this.rowVote(target, userId);

    await this.write(target, userId, vote);

    return vote;
  }
}
