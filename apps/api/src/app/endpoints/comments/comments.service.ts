import { Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Logged } from "../../../decorators/logged.decorator";
import { votedSubjectsOf, withVotes } from "../../../services/comment/comment.mapper";
import { CommentService } from "../../../services/comment/comment.service";
import {
  CommentInput,
  CommentPageQuery,
  CommentView,
  StoredCommentView,
} from "../../../services/comment/comment.types";
import { CommentSubject } from "../../../services/comment/utils/comment-subject.const";
import { ReportService } from "../../../services/report/report.service";
import { VoteStateService } from "../../../services/vote-cache/vote-state.service";

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentService: CommentService,
    private readonly reportService: ReportService,
    private readonly voteState: VoteStateService,
  ) {}

  @Logged()
  async create(titleId: string, userId: string, data: CommentInput): Promise<CommentView> {
    return this.commentService.create(titleId, userId, data);
  }

  @Logged()
  async report(commentId: string, userId: string, reason?: string): Promise<void> {
    await this.reportService.submit(commentId, userId, reason);
  }

  @Logged()
  async remove(commentId: string, userId: string, role?: Role): Promise<void> {
    await this.commentService.remove(commentId, userId, role);
  }

  @Logged()
  async findForSubject(
    subject: CommentSubject,
    query: CommentPageQuery,
    viewerId?: string,
  ): Promise<{ items: CommentView[]; totalCount: number }> {
    const { items, totalCount } = await this.commentService.findForSubject(
      subject,
      query,
      viewerId,
    );

    return { items: await this.withVotes(items, viewerId), totalCount };
  }

  @Logged()
  async findReplies(
    commentId: string,
    query: { page?: number; limit?: number },
    viewerId?: string,
  ): Promise<{ items: CommentView[]; totalCount: number }> {
    const { items, totalCount } = await this.commentService.findReplies(commentId, query, viewerId);

    return { items: await this.withVotes(items, viewerId), totalCount };
  }

  @Logged({ completedLevel: "debug" })
  private async withVotes(
    comments: StoredCommentView[],
    viewerId?: string,
  ): Promise<CommentView[]> {
    const votes = await this.voteState.forComments(votedSubjectsOf(comments), viewerId);

    return comments.map((comment) => withVotes(comment, votes));
  }
}
