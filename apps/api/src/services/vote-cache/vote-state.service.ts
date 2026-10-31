import { Injectable } from "@nestjs/common";
import { Logged } from "../../decorators/logged.decorator";
import { ReactionArc } from "../reaction/enums/reaction-arc.enum";
import { ReactionTarget, subjectIdOf, targetOf } from "../reaction/utils/reaction-target.const";
import { resolveVote, Vote } from "../reaction/utils/vote.util";
import { throughRedis } from "../redis/redis.error";
import { RedisService } from "../redis/redis.service";
import {
  decodeVote,
  encodeVote,
  NO_VIEWER_VOTES,
  ViewerVotes,
  VOTE_TTL_SECONDS,
  VotedSubject,
  voteKey,
} from "./vote-cache.const";

@Injectable()
export class VoteStateService {
  constructor(private readonly redis: RedisService) {}

  @Logged({ completedLevel: "debug" })
  async get(target: ReactionTarget, userId: string): Promise<Vote | undefined> {
    return decodeVote(
      await throughRedis("read a vote", () => this.redis.get(voteKey(target, userId))),
    );
  }

  @Logged({ completedLevel: "debug" })
  forTitles(subjects: VotedSubject[], viewerId: string | null | undefined): Promise<ViewerVotes> {
    return this.forPage(ReactionArc.TITLE, subjects, viewerId);
  }

  @Logged({ completedLevel: "debug" })
  forComments(subjects: VotedSubject[], viewerId: string | null | undefined): Promise<ViewerVotes> {
    return this.forPage(ReactionArc.COMMENT, subjects, viewerId);
  }

  private async forPage(
    arc: ReactionArc,
    subjects: VotedSubject[],
    viewerId: string | null | undefined,
  ): Promise<ViewerVotes> {
    if (!viewerId) return NO_VIEWER_VOTES;

    const cached = await this.readMany(
      subjects.map((subject) => targetOf(arc, subject.id)),
      viewerId,
    );

    return new Map(
      subjects.map((subject) => [
        subject.id,
        resolveVote(cached.get(subject.id), subject.reactions?.[0]?.type ?? null),
      ]),
    );
  }

  @Logged({ completedLevel: "debug" })
  private async readMany(
    targets: ReactionTarget[],
    userId: string,
  ): Promise<ReadonlyMap<string, Vote>> {
    if (targets.length === 0) return new Map();

    let raw: (string | null)[];
    try {
      raw = await this.mget(targets.map((target) => voteKey(target, userId)));
    } catch {
      return new Map();
    }

    const votes = new Map<string, Vote>();

    targets.forEach((target, index) => {
      const vote = decodeVote(raw[index] ?? null);
      if (vote !== undefined) votes.set(subjectIdOf(target), vote);
    });

    return votes;
  }

  @Logged({ completedLevel: "debug", failedLevel: "warn" })
  private mget(keys: string[]): Promise<(string | null)[]> {
    return this.redis.mget(keys);
  }

  @Logged()
  async set(target: ReactionTarget, userId: string, vote: Vote): Promise<Vote | undefined> {
    return decodeVote(
      await throughRedis("write a vote", () =>
        this.redis.set(voteKey(target, userId), encodeVote(vote), "EX", VOTE_TTL_SECONDS, "GET"),
      ),
    );
  }
}
