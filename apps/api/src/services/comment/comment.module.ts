import { Module } from "@nestjs/common";
import { EngagementModule } from "../engagement/engagement.module";
import { ImageModule } from "../image/image.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ReportModule } from "../report/report.module";
import { VoteCacheModule } from "../vote-cache/vote-cache.module";
import { CommentService } from "./comment.service";

@Module({
  imports: [PrismaModule, ImageModule, ReportModule, EngagementModule, VoteCacheModule],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
