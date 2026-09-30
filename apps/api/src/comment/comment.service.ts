import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ReactionType, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CommentSortMode, GetCommentsDto } from "./dto/request/get-comments.dto";
import { CommentResponseDto, CommentWithAuthor } from "./dto/response/comment-response.dto";

const REPLY_PREVIEW_SIZE = 3;

const AUTHOR_SELECT = { id: true, email: true, displayName: true, avatarUrl: true } as const;

type ReactionCounts = { likes: number; dislikes: number };

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async findForTitle(
    titleId: string,
    { page = 1, limit = 10, sort = "newest" }: GetCommentsDto,
    viewerId?: string,
  ): Promise<{ items: CommentResponseDto[]; totalCount: number }> {
    const where: Prisma.TitleCommentWhereInput = { titleId, parentId: null };

    const [rootIds, totalCount] = await Promise.all([
      this.findRootIds(titleId, sort, page, limit),
      this.prisma.titleComment.count({ where }),
    ]);

    if (rootIds.length === 0) return { items: [], totalCount };

    const [roots, replies] = await Promise.all([
      this.prisma.titleComment.findMany({
        where: { id: { in: rootIds } },
        include: { user: { select: AUTHOR_SELECT } },
      }),
      this.findReplyPreviews(rootIds),
    ]);

    const replyCounts = await this.countReplies(rootIds);

    const all = [...roots, ...replies];
    const [counts, myReactions, authorScores] = await Promise.all([
      this.countReactions(all.map((comment) => comment.id)),
      this.findMyReactions(
        all.map((comment) => comment.id),
        viewerId,
      ),
      this.findAuthorScores(
        titleId,
        all.map((comment) => comment.userId),
      ),
    ]);

    const toDto = (
      comment: CommentWithAuthor,
      children: CommentResponseDto[] = [],
      replyCount = 0,
    ) =>
      new CommentResponseDto(
        comment,
        counts.get(comment.id) ?? { likes: 0, dislikes: 0 },
        myReactions.get(comment.id) ?? null,
        authorScores.get(comment.userId) ?? null,
        children,
        replyCount,
      );

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
      .map((root) =>
        toDto(root, repliesByParent.get(root.id) ?? [], replyCounts.get(root.id) ?? 0),
      );

    return { items, totalCount };
  }

  async create(
    titleId: string,
    userId: string,
    {
      text,
      hasSpoiler = false,
      parentId,
    }: { text: string; hasSpoiler?: boolean; parentId?: string },
  ): Promise<CommentResponseDto> {
    await this.assertTitleExists(titleId);
    if (parentId) await this.assertRepliable(parentId, titleId);

    const comment = await this.prisma.titleComment.create({
      data: { titleId, userId, text, hasSpoiler, parentId },
      include: { user: { select: AUTHOR_SELECT } },
    });

    const authorScores = await this.findAuthorScores(titleId, [userId]);
    return new CommentResponseDto(
      comment,
      { likes: 0, dislikes: 0 },
      null,
      authorScores.get(userId) ?? null,
    );
  }

  async react(
    commentId: string,
    userId: string,
    type: ReactionType,
  ): Promise<{ likes: number; dislikes: number; myReaction: ReactionType | null }> {
    await this.assertCommentExists(commentId);

    const { count: withdrawn } = await this.prisma.commentReaction.deleteMany({
      where: { commentId, userId, type },
    });

    if (withdrawn > 0) {
      return { ...(await this.countFor(commentId)), myReaction: null };
    }

    await this.prisma.commentReaction.upsert({
      where: { commentId_userId: { commentId, userId } },
      create: { commentId, userId, type },
      update: { type },
    });

    const counts = await this.countFor(commentId);
    return { ...counts, myReaction: type };
  }

  private async findReplyPreviews(rootIds: string[]): Promise<CommentWithAuthor[]> {
    if (rootIds.length === 0) return [];

    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM (
        SELECT c."id", ROW_NUMBER() OVER (PARTITION BY c."parentId" ORDER BY c."createdAt" ASC) AS rn
        FROM "TitleComment" c
        WHERE c."parentId" IN (${Prisma.join(rootIds)})
      ) ranked
      WHERE ranked.rn <= ${REPLY_PREVIEW_SIZE}
    `;

    if (rows.length === 0) return [];

    return this.prisma.titleComment.findMany({
      where: { id: { in: rows.map((row) => row.id) } },
      include: { user: { select: AUTHOR_SELECT } },
      orderBy: { createdAt: "asc" },
    });
  }

  private async countReplies(rootIds: string[]): Promise<Map<string, number>> {
    if (rootIds.length === 0) return new Map();

    const grouped = await this.prisma.titleComment.groupBy({
      by: ["parentId"],
      where: { parentId: { in: rootIds } },
      _count: { _all: true },
    });

    return new Map(grouped.map((row) => [row.parentId!, row._count._all]));
  }

  async findReplies(
    commentId: string,
    { page = 1, limit = 10 }: { page?: number; limit?: number },
    viewerId?: string,
  ): Promise<{ items: CommentResponseDto[]; totalCount: number }> {
    await this.assertCommentExists(commentId);

    const [replies, totalCount] = await Promise.all([
      this.prisma.titleComment.findMany({
        where: { parentId: commentId },
        include: { user: { select: AUTHOR_SELECT } },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.titleComment.count({ where: { parentId: commentId } }),
    ]);

    if (replies.length === 0) return { items: [], totalCount };

    const ids = replies.map((reply) => reply.id);
    const [counts, myReactions, authorScores] = await Promise.all([
      this.countReactions(ids),
      this.findMyReactions(ids, viewerId),
      this.findAuthorScores(
        replies[0].titleId,
        replies.map((reply) => reply.userId),
      ),
    ]);

    return {
      items: replies.map(
        (reply) =>
          new CommentResponseDto(
            reply,
            counts.get(reply.id) ?? { likes: 0, dislikes: 0 },
            myReactions.get(reply.id) ?? null,
            authorScores.get(reply.userId) ?? null,
          ),
      ),
      totalCount,
    };
  }

  private async countFor(commentId: string): Promise<ReactionCounts> {
    return (await this.countReactions([commentId])).get(commentId) ?? { likes: 0, dislikes: 0 };
  }

  async report(commentId: string, userId: string, reason?: string): Promise<void> {
    await this.assertCommentExists(commentId);

    await this.prisma.commentReport.upsert({
      where: { commentId_userId: { commentId, userId } },
      create: { commentId, userId, reason },
      update: { reason },
    });
  }

  async remove(commentId: string, userId: string, role?: Role): Promise<void> {
    const comment = await this.prisma.titleComment.findUnique({
      where: { id: commentId },
      select: { userId: true },
    });
    if (!comment) throw new NotFoundException(`Comment with id ${commentId} not found`);

    if (comment.userId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException("You can only delete your own comments");
    }

    await this.prisma.titleComment.delete({ where: { id: commentId } });
  }

  private async findRootIds(
    titleId: string,
    sort: CommentSortMode,
    page: number,
    limit: number,
  ): Promise<string[]> {
    const skip = (page - 1) * limit;

    if (sort === "hottest") {
      const rows = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT c."id"
        FROM "TitleComment" c
        LEFT JOIN "CommentReaction" r ON r."commentId" = c."id" AND r."type" = 'LIKE'
        WHERE c."titleId" = ${titleId} AND c."parentId" IS NULL
        GROUP BY c."id", c."createdAt"
        ORDER BY COUNT(r."id") DESC, c."createdAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
      return rows.map((row) => row.id);
    }

    const roots = await this.prisma.titleComment.findMany({
      where: { titleId, parentId: null },
      orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
      skip,
      take: limit,
      select: { id: true },
    });
    return roots.map((root) => root.id);
  }

  private async countReactions(commentIds: string[]): Promise<Map<string, ReactionCounts>> {
    if (commentIds.length === 0) return new Map();

    const grouped = await this.prisma.commentReaction.groupBy({
      by: ["commentId", "type"],
      where: { commentId: { in: commentIds } },
      _count: { _all: true },
    });

    const counts = new Map<string, ReactionCounts>();
    for (const row of grouped) {
      const current = counts.get(row.commentId) ?? { likes: 0, dislikes: 0 };
      if (row.type === ReactionType.LIKE) current.likes = row._count._all;
      else current.dislikes = row._count._all;
      counts.set(row.commentId, current);
    }
    return counts;
  }

  private async findMyReactions(
    commentIds: string[],
    userId?: string,
  ): Promise<Map<string, ReactionType>> {
    if (!userId || commentIds.length === 0) return new Map();

    const reactions = await this.prisma.commentReaction.findMany({
      where: { userId, commentId: { in: commentIds } },
      select: { commentId: true, type: true },
    });
    return new Map(reactions.map((reaction) => [reaction.commentId, reaction.type]));
  }

  private async findAuthorScores(titleId: string, userIds: string[]): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();

    const ratings = await this.prisma.titleRating.findMany({
      where: { titleId, userId: { in: userIds } },
      select: { userId: true, score: true },
    });
    return new Map(ratings.map((rating) => [rating.userId, rating.score]));
  }

  private async assertTitleExists(titleId: string) {
    const title = await this.prisma.title.findUnique({
      where: { id: titleId },
      select: { id: true },
    });
    if (!title) throw new BadRequestException(`Title with id ${titleId} not found`);
  }

  private async assertCommentExists(commentId: string) {
    const comment = await this.prisma.titleComment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!comment) throw new NotFoundException(`Comment with id ${commentId} not found`);
  }

  private async assertRepliable(parentId: string, titleId: string) {
    const parent = await this.prisma.titleComment.findUnique({
      where: { id: parentId },
      select: { titleId: true, parentId: true },
    });

    if (!parent) throw new BadRequestException(`Comment with id ${parentId} not found`);
    if (parent.titleId !== titleId)
      throw new BadRequestException("That comment belongs to a different title");
    if (parent.parentId)
      throw new BadRequestException("Replies cannot be replied to — reply to the comment instead");
  }
}
