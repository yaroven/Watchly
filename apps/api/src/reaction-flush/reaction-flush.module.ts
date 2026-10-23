import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { REACTION_FLUSH_QUEUE_OPTIONS } from "./reaction-flush-queue.options";
import { ReactionFlushScheduler } from "./reaction-flush-scheduler.service";

/**
 * The producer half, which is all the api needs. The processor is wired by the
 * worker, the same split `ImageTranscoderModule` has: a feature injects the
 * scheduler and never sees a `Queue`.
 */
@Module({
  imports: [BullModule.registerQueue(REACTION_FLUSH_QUEUE_OPTIONS)],
  providers: [ReactionFlushScheduler],
  exports: [ReactionFlushScheduler, BullModule],
})
export class ReactionFlushModule {}
