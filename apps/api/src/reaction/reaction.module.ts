import { Module } from "@nestjs/common";
import { EngagementModule } from "../engagement/engagement.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ReactionFlushModule } from "../reaction-flush/reaction-flush.module";
import { VoteCacheModule } from "../vote-cache/vote-cache.module";
import { ReactionController } from "./reaction.controller";
import { ReactionService } from "./reaction.service";

@Module({
  imports: [PrismaModule, EngagementModule, VoteCacheModule, ReactionFlushModule],
  controllers: [ReactionController],
  providers: [ReactionService],
  exports: [ReactionService],
})
export class ReactionModule {}
