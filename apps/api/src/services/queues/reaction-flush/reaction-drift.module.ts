import { Module } from "@nestjs/common";
import { RedisModule } from "../../redis/redis.module";
import { ReactionDriftService } from "./reaction-drift.service";

@Module({
  imports: [RedisModule],
  providers: [ReactionDriftService],
  exports: [ReactionDriftService],
})
export class ReactionDriftModule {}
