import { Module } from "@nestjs/common";
import { VoteCacheModule } from "../vote-cache/vote-cache.module";
import { ViewerVotesService } from "./viewer-votes.service";

/**
 * The reaction domain's read half, split from `ReactionModule` so a feature can
 * import it without the flush queue arriving behind it.
 */
@Module({
  imports: [VoteCacheModule],
  providers: [ViewerVotesService],
  exports: [ViewerVotesService],
})
export class ViewerVotesModule {}
