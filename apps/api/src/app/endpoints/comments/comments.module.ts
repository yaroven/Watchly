import { Module } from "@nestjs/common";
import { CommentModule } from "../../../services/comment/comment.module";
import { ReportModule } from "../../../services/report/report.module";
import { VoteCacheModule } from "../../../services/vote-cache/vote-cache.module";
import CommentsController from "./comments.controller";
import { CommentsService } from "./comments.service";

@Module({
  imports: [CommentModule, ReportModule, VoteCacheModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
