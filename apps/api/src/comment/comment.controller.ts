import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUserId, OptionalUserId } from "../auth/decorators/current-user-id.decorator";
import { OptionalAuth } from "../auth/decorators/optional-auth.decorator";
import { PaginatedResponseOf } from "../common/utils/paginated-response-of.util";
import { CommentService } from "./comment.service";
import { CreateCommentDto } from "./dto/request/create-comment.dto";
import { GetCommentsDto } from "./dto/request/get-comments.dto";
import { ReactToCommentDto } from "./dto/request/react-to-comment.dto";
import { ReportCommentDto } from "./dto/request/report-comment.dto";
import { CommentResponseDto } from "./dto/response/comment-response.dto";

@ApiTags("comments")
@Controller()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @ApiOperation({
    summary: "List a title's comments",
    description:
      "Public, paginated over top-level comments; each carries its replies. A signed-in caller also gets their own reaction on each one. `sort`: newest (default), oldest, hottest — hottest ranks by likes.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: PaginatedResponseOf(CommentResponseDto) })
  @OptionalAuth()
  @Get("title/:id/comments")
  findForTitle(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: GetCommentsDto,
    @OptionalUserId() userId?: string,
  ) {
    return this.commentService.findForTitle(id, query, userId);
  }

  @ApiOperation({
    summary: "List a comment's replies",
    description:
      "The comment list ships the first few replies inline; this returns the rest, paginated.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: PaginatedResponseOf(CommentResponseDto) })
  @OptionalAuth()
  @Get("comments/:id/replies")
  findReplies(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: GetCommentsDto,
    @OptionalUserId() userId?: string,
  ) {
    return this.commentService.findReplies(id, query, userId);
  }

  @ApiOperation({ summary: "Comment on a title, or reply to a comment" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiCreatedResponse({ type: CommentResponseDto })
  @Auth()
  @Post("title/:id/comments")
  create(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: CreateCommentDto,
    @CurrentUserId() userId: string,
  ) {
    return this.commentService.create(id, userId, data);
  }

  @ApiOperation({
    summary: "Like or dislike a comment",
    description:
      "Sending the reaction you already have withdraws it; sending the other one switches sides.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "The comment's counts after the vote, plus your own reaction" })
  @Auth()
  @Post("comments/:id/reactions")
  @HttpCode(HttpStatus.OK)
  react(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: ReactToCommentDto,
    @CurrentUserId() userId: string,
  ) {
    return this.commentService.react(id, userId, data.type);
  }

  @ApiOperation({ summary: "Report a comment" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: "Comment not found" })
  @Auth()
  @Post("comments/:id/report")
  @HttpCode(HttpStatus.NO_CONTENT)
  report(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: ReportCommentDto,
    @CurrentUserId() userId: string,
  ) {
    return this.commentService.report(id, userId, data.reason);
  }

  @ApiOperation({
    summary: "Delete a comment",
    description: "Authors can delete their own; admins can delete any. Replies go with it.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: "Not your comment" })
  @Auth()
  @Delete("comments/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
    @Req() { role }: Request,
  ) {
    return this.commentService.remove(id, userId, role);
  }
}
