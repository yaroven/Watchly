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

    { provide: REACTIONS, useExisting: CachedReactionService },
  ],

  exports: [REACTIONS, ReactionService],
})
export class ReactionModule {}
