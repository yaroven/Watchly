import { Module } from "@nestjs/common";
import { EngagementModule } from "../engagement/engagement.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ReportModule } from "../report/report.module";
import { S3Module } from "../s3/s3.module";
import { VoteCacheModule } from "../vote-cache/vote-cache.module";
import { CommentController } from "./comment.controller";
import { CommentService } from "./comment.service";

@Module({
  imports: [PrismaModule, S3Module, ReportModule, EngagementModule, VoteCacheModule],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
