import { Module } from "@nestjs/common";
import { EngagementModule } from "../engagement/engagement.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { ReactionController } from "./reaction.controller";
import { ReactionService } from "./reaction.service";
import { VoteStateService } from "./vote-state.service";

@Module({
  imports: [PrismaModule, EngagementModule, RedisModule],
  controllers: [ReactionController],
  providers: [ReactionService, VoteStateService],
  exports: [ReactionService, VoteStateService],
})
export class ReactionModule {}
