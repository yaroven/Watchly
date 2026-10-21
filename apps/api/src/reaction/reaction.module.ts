import { Module } from "@nestjs/common";
import { EngagementModule } from "../engagement/engagement.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ReactionController } from "./reaction.controller";
import { ReactionService } from "./reaction.service";

@Module({
  imports: [PrismaModule, EngagementModule],
  controllers: [ReactionController],
  providers: [ReactionService],
  exports: [ReactionService],
})
export class ReactionModule {}
