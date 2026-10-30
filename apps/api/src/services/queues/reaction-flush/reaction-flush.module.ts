import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { REACTION_FLUSH_QUEUE_OPTIONS } from "./reaction-flush-queue.options";
import { ReactionFlushScheduler } from "./reaction-flush-scheduler.service";

@Module({
  imports: [BullModule.registerQueue(REACTION_FLUSH_QUEUE_OPTIONS)],
  providers: [ReactionFlushScheduler],
  exports: [ReactionFlushScheduler, BullModule],
})
export class ReactionFlushModule {}
