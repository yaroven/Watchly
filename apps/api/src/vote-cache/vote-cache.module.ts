import { Module } from "@nestjs/common";
import { RedisModule } from "../redis/redis.module";
import { VoteStateService } from "./vote-state.service";

@Module({
  imports: [RedisModule],
  providers: [VoteStateService],
  exports: [VoteStateService],
})
export class VoteCacheModule {}
