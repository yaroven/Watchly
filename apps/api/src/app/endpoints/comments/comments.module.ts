import { Module } from "@nestjs/common";
import { CommentModule } from "../../../services/comment/comment.module";
import CommentsController from "./comments.controller";

@Module({
  imports: [CommentModule],
  controllers: [CommentsController],
})
export class CommentsModule {}
