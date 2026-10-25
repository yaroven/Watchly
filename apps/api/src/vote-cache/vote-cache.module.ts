import { Module } from "@nestjs/common";
import { RedisModule } from "../redis/redis.module";
import { VoteStateService } from "./vote-state.service";

/**
 * Redis and nothing else: no Prisma, because no method here covers for a miss
 * by reading a row. A module of its own so that a *reader* can depend on the
 * cache without depending on the flush. `TitleModule` and `CommentModule` need to know what a
 * viewer holds; importing `ReactionModule` for that would pull the flush queue
 * into their graphs, which is the thing `UserAvatarService` used to do with its
 * own `@InjectQueue`.
 */
@Module({
  imports: [RedisModule],
  providers: [VoteStateService],
  exports: [VoteStateService],
})
export class VoteCacheModule {}
