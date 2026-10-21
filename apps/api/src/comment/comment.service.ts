import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { EngagementCountersService } from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReportService } from "../report/report.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import assertTitleExists from "../title/utils/assert-title-exists.util";
import { CommentSortMode, GetCommentsDto } from "./dto/request/get-comments.dto";
import {
  CommentResponseDto,
  CommentResponseOptions,
  CommentWithAuthor,
} from "./dto/response/comment-response.dto";
import {
  CommentSubject,
  countersSubjectOf,
  replySubject,
  subjectWhere,
} from "./utils/comment-subject.const";
import commentQuery from "./utils/comment.query";

const titleOf = (subject: CommentSubject): string | undefined =>
  "titleId" in subject ? subject.titleId : undefined;

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly reportService: ReportService,
    private readonly counters: EngagementCountersService,
  ) {}

  private avatarUrl(user: { avatarKey: string | null }): string | null {
    return user.avatarKey
      ? this.s3Service.getPublicUrl(user.avatarKey, BucketType.PROCESSED)
      : null;
  }

  private toResponse(
    comment: CommentWithAuthor,
    options: Omit<CommentResponseOptions, "authorAvatarUrl"> = {},
  ): CommentResponseDto {
    return new CommentResponseDto(comment, {
      ...options,
      authorAvatarUrl: this.avatarUrl(comment.user),
    });
  }

  async findForSubject(
    subject: CommentSubject,
    { page = 1, limit = 10, sort = "newest" }: GetCommentsDto,
    viewerId?: string,
  ): Promise<{ items: CommentResponseDto[]; totalCount: number }> {
    const where = subjectWhere(subject);

    const [rootIds, totalCount] = await Promise.all([
      this.findRootIds(subject, sort, page, limit),
      this.prisma.comment.count({ where }),
    ]);

    if (rootIds.length === 0) return { items: [], totalCount };

    const titleId = titleOf(subject);

    const [roots, replies] = (await Promise.all([
      this.prisma.comment.findMany({
        where: { id: { in: rootIds } },
        include: commentQuery.withViewer(viewerId, titleId),
      }),
      this.findReplyPreviews(rootIds, viewerId, titleId),
    ])) as [CommentWithAuthor[], CommentWithAuthor[]];

    const toDto = (comment: CommentWithAuthor, nested: CommentResponseDto[] = []) =>
      this.toResponse(comment, { replies: nested });

    const repliesByParent = new Map<string, CommentResponseDto[]>();
    for (const reply of replies) {
      const siblings = repliesByParent.get(reply.parentId!) ?? [];
      siblings.push(toDto(reply));
      repliesByParent.set(reply.parentId!, siblings);
    }

    const byId = new Map(roots.map((root) => [root.id, root]));
    const items = rootIds
      .map((id) => byId.get(id))
      .filter((root): root is CommentWithAuthor => Boolean(root))
      .map((root) => toDto(root, repliesByParent.get(root.id) ?? []));

    return { items, totalCount };
  }

  async create(
    subject: CommentSubject,
    userId: string,
    { text, hasSpoiler = false }: { text: string; hasSpoiler?: boolean },
    expectedThread?: CommentSubject,
  ): Promise<CommentResponseDto> {
    const thread = await this.assertSubjectAcceptsComments(subject);

    if (expectedThread && JSON.stringify(thread) !== JSON.stringify(expectedThread)) {
      throw new BadRequestException("That comment belongs to a different thread");
    }

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = (await tx.comment.create({
        data: { ...subject, userId, text, hasSpoiler },
        include: commentQuery.withViewer(userId, titleOf(thread)),
      })) as CommentWithAuthor;

      const counts = await this.counters.recomputeComments(countersSubjectOf(subject), tx);

      return { ...created, counters: counts };
    });

    return this.toResponse(comment);
  }

  private async findReplyPreviews(
    rootIds: string[],
    viewerId?: string,
    titleId?: string,
  ): Promise<CommentWithAuthor[]> {
    if (rootIds.length === 0) return [];

    const rows = await this.prisma.$queryRaw<{ id: string }[]>(
      commentQuery.replyPreviewIds(rootIds),
    );

    if (rows.length === 0) return [];

    return await this.prisma.comment.findMany({
      where: { id: { in: rows.map((row) => row.id) } },
      include: commentQuery.withViewer(viewerId, titleId),
      orderBy: { createdAt: "asc" },
    });
  }

  async findReplies(
    commentId: string,
    { page = 1, limit = 10 }: { page?: number; limit?: number },
    viewerId?: string,
  ): Promise<{ items: CommentResponseDto[]; totalCount: number }> {
    const parent = await this.readSubjectOf(commentId);
    const where = subjectWhere(replySubject(commentId));

    const [replies, totalCount] = (await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: commentQuery.withViewer(viewerId, titleOf(parent)),
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
    ])) as [CommentWithAuthor[], number];

    return { items: replies.map((reply) => this.toResponse(reply)), totalCount };
  }

  async report(commentId: string, userId: string, reason?: string): Promise<void> {
    await this.assertCommentExists(commentId);

    await this.reportService.submit(commentId, userId, reason);
  }

  async remove(commentId: string, userId: string, role?: Role): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, titleId: true, parentId: true },
    });
    if (!comment) throw new NotFoundException(`Comment with id ${commentId} not found`);

    if (comment.userId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException("You can only delete your own comments");
    }

    const subject: CommentSubject = comment.titleId
      ? { titleId: comment.titleId }
      : { parentId: comment.parentId! };

    await this.prisma.$transaction(async (tx) => {
      await tx.comment.delete({ where: { id: commentId } });
      await this.counters.recomputeComments(countersSubjectOf(subject), tx);
    });
  }

  private async findRootIds(
    subject: CommentSubject,
    sort: CommentSortMode,
    page: number,
    limit: number,
  ): Promise<string[]> {
    const skip = (page - 1) * limit;

    if (sort === "hottest") {
      const rows = await this.prisma.$queryRaw<{ id: string }[]>(
        commentQuery.hottestRootIds(subject, limit, skip),
      );
      return rows.map((row) => row.id);
    }

    const roots = await this.prisma.comment.findMany({
      where: subjectWhere(subject),
      orderBy: commentQuery.rootOrder(sort),
      skip,
      take: limit,
      select: { id: true },
    });
    return roots.map((root) => root.id);
  }

  private async assertCommentExists(commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!comment) throw new NotFoundException(`Comment with id ${commentId} not found`);
  }

  private async readSubjectOf(commentId: string): Promise<CommentSubject> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { titleId: true, parentId: true },
    });
    if (!comment) throw new NotFoundException(`Comment with id ${commentId} not found`);

    return comment.titleId ? { titleId: comment.titleId } : { parentId: comment.parentId! };
  }

  private async assertSubjectAcceptsComments(subject: CommentSubject): Promise<CommentSubject> {
    if ("titleId" in subject) {
      await assertTitleExists(this.prisma, subject.titleId);
      return subject;
    }

    const parent = await this.readSubjectOf(subject.parentId);
    if (!("titleId" in parent)) {
      throw new BadRequestException("Replies cannot be replied to — reply to the comment instead");
    }

    return parent;
  }
}
