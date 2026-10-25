import { Module } from "@nestjs/common";
import { EngagementModule } from "../engagement/engagement.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ReactionFlushModule } from "../reaction-flush/reaction-flush.module";
import { VoteCacheModule } from "../vote-cache/vote-cache.module";
import { CachedReactionService } from "./cached-reaction.service";
import { ReactionController } from "./reaction.controller";
import { ReactionService } from "./reaction.service";
import { REACTIONS } from "./reaction.types";

@Module({
  imports: [PrismaModule, EngagementModule, VoteCacheModule, ReactionFlushModule],
  controllers: [ReactionController],
  providers: [
    ReactionService,
    CachedReactionService,
    // The one line that decides whether reacting goes through Redis at all.
    // Point it at `ReactionService` and the cache, the queue and the flush stop
    // being on the path of a request — everything still works, synchronously,
    // the way it did before any of them existed. `useExisting` rather than
    // `useClass` so the token and the class are the same instance.
    { provide: REACTIONS, useExisting: CachedReactionService },
  ],
  // The direct one is exported for the flush processor, which writes rows and
  // must not go back through the cache to do it.
  exports: [REACTIONS, ReactionService],
})
export class ReactionModule {}
