import { Injectable } from "@nestjs/common";
import { Logged } from "../../../decorators/logged.decorator";
import { ReactionArc } from "../../reaction/enums/reaction-arc.enum";
import { REACTION_ARCS } from "../../reaction/utils/reaction-target.const";
import { RedisService } from "../../redis/redis.service";

export type ReactionDrift = Partial<Record<ReactionArc, number>>;

const driftKey = (arc: ReactionArc): string => `reactions:drift:${arc}`;

@Injectable()
export class ReactionDriftService {
  constructor(private readonly redis: RedisService) {}

  @Logged({ failedLevel: "warn" })
  async publish(arc: ReactionArc, drifted: number): Promise<void> {
    await this.redis.set(driftKey(arc), drifted);
  }

  @Logged({ completedLevel: "debug" })
  async read(): Promise<ReactionDrift> {
    const values = await this.redis.mget(REACTION_ARCS.map(driftKey));

    return Object.fromEntries(
      REACTION_ARCS.flatMap((arc, index) => {
        const raw = values[index];
        const subjects = Number(raw);
        return raw !== null && Number.isFinite(subjects) ? [[arc, subjects]] : [];
      }),
    );
  }
}
