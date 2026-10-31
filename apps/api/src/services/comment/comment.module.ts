import { Module } from "@nestjs/common";
import { EngagementModule } from "../engagement/engagement.module";
import { ImageModule } from "../image/image.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CommentService } from "./comment.service";

@Module({
  imports: [PrismaModule, ImageModule, EngagementModule],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
