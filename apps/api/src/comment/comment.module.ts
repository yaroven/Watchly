import { Module } from "@nestjs/common";
import { EngagementModule } from "../engagement/engagement.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ReportModule } from "../report/report.module";
import { S3Module } from "../s3/s3.module";
import { CommentController } from "./comment.controller";
import { CommentService } from "./comment.service";

@Module({
  imports: [PrismaModule, S3Module, ReportModule, EngagementModule],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
