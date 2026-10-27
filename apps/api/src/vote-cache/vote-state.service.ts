import { Injectable, Logger } from "@nestjs/common";
import { ReactionArc } from "../reaction/enums/reaction-arc.enum";
import { ReactionTarget, subjectIdOf, targetOf } from "../reaction/utils/reaction-target.const";
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

@Injectable()
export class VoteStateService {
  private readonly logger = new Logger(VoteStateService.name);

  constructor(private readonly redis: RedisService) {}

  async get(target: ReactionTarget, userId: string): Promise<Vote | undefined> {
    return decodeVote(
      await throughRedis("read a vote", () => this.redis.get(voteKey(target, userId))),
    );
  }

  forTitles(
    subjects: { id: string }[],
    viewerId: string | null | undefined,
  ): Promise<VoteOverrides> {
    return this.forPage(ReactionArc.TITLE, subjects, viewerId);
  }

  forComments(
    subjects: { id: string }[],
    viewerId: string | null | undefined,
  ): Promise<VoteOverrides> {
    return this.forPage(ReactionArc.COMMENT, subjects, viewerId);
  }

  private forPage(
    arc: ReactionArc,
    subjects: { id: string }[],
    viewerId: string | null | undefined,
  ): Promise<VoteOverrides> {
    if (!viewerId) return Promise.resolve(NO_VOTE_OVERRIDES);

    return this.readMany(
      subjects.map((subject) => targetOf(arc, subject.id)),
      viewerId,
    );
  }

  private async readMany(targets: ReactionTarget[], userId: string): Promise<VoteOverrides> {
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

  async set(target: ReactionTarget, userId: string, vote: Vote): Promise<Vote | undefined> {
    return decodeVote(
      await throughRedis("write a vote", () =>
        this.redis.set(voteKey(target, userId), encodeVote(vote), "EX", VOTE_TTL_SECONDS, "GET"),
      ),
    );
  }
}
