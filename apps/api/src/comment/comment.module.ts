import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../s3/s3.module";
import { CommentController } from "./comment.controller";
import { CommentService } from "./comment.service";

@Module({
  imports: [PrismaModule, S3Module],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}
