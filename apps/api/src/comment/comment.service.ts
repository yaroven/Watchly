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
      this.prisma.titleComment.findMany({
        where: { parentId: { in: rootIds } },
        include: { user: { select: AUTHOR_SELECT } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

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

    const toDto = (comment: CommentWithAuthor, children: CommentResponseDto[] = []) =>
      new CommentResponseDto(
        comment,
        counts.get(comment.id) ?? { likes: 0, dislikes: 0 },
        myReactions.get(comment.id) ?? null,
        authorScores.get(comment.userId) ?? null,
        children,
      );

    const repliesByParent = new Map<string, CommentResponseDto[]>();
    for (const reply of replies) {
      const siblings = repliesByParent.get(reply.parentId!) ?? [];
      siblings.push(toDto(reply));
      repliesByParent.set(reply.parentId!, siblings);
    }

    // findMany ignores the order of an `in` filter, so the ranking computed
    // above is reapplied here rather than trusted to survive the round trip.
    const byId = new Map(roots.map((root) => [root.id, root]));
    const items = rootIds
      .map((id) => byId.get(id))
      .filter((root): root is CommentWithAuthor => Boolean(root))
      .map((root) => toDto(root, repliesByParent.get(root.id) ?? []));

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

  /**
   * Toggling: the same reaction again withdraws it, the other one switches
   * sides. Modelled as one row per (comment, viewer) so a vote cannot be cast
   * twice, which also makes "switch" an update rather than a delete-and-insert.
   */
  async react(
    commentId: string,
    userId: string,
    type: ReactionType,
  ): Promise<{ likes: number; dislikes: number; myReaction: ReactionType | null }> {
    await this.assertCommentExists(commentId);

    // Deleting first answers "is this a withdrawal?" with the delete itself,
    // so there is no read whose result a second request could invalidate: two
    // clicks racing would otherwise both see no row and both insert, and one
    // would die on the unique index. The upsert closes the same race on the
    // other branch — Postgres resolves it as ON CONFLICT rather than a failed
    // insert.
    const { count: withdrawn } = await this.prisma.commentReaction.deleteMany({
      where: { commentId, userId, type },
    });

    if (withdrawn > 0) {
      const counts = await this.countFor(commentId);
      return { ...counts, myReaction: null };
    }

    await this.prisma.commentReaction.upsert({
      where: { commentId_userId: { commentId, userId } },
      create: { commentId, userId, type },
      update: { type },
    });

    const counts = await this.countFor(commentId);
    return { ...counts, myReaction: type };
  }

  private async countFor(commentId: string): Promise<ReactionCounts> {
    return (await this.countReactions([commentId])).get(commentId) ?? { likes: 0, dislikes: 0 };
  }

  /** Re-reporting replaces the reason rather than failing: the unique index exists to stop pile-ons, not to punish a second thought. */
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

    // Replies cascade with the parent — deleting a comment mid-thread would
    // otherwise leave answers to something nobody can read.
    await this.prisma.titleComment.delete({ where: { id: commentId } });
  }

  /**
   * "hottest" ranks by likes alone, which Prisma cannot express: its relation
   * `_count` ordering counts every reaction, so a comment buried in dislikes
   * would rank as hot. Raw SQL is confined to picking the page's ids; the rows
   * themselves are still loaded through the client.
   */
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
    viewerId?: string,
  ): Promise<Map<string, ReactionType>> {
    if (!viewerId || commentIds.length === 0) return new Map();

    const mine = await this.prisma.commentReaction.findMany({
      where: { userId: viewerId, commentId: { in: commentIds } },
      select: { commentId: true, type: true },
    });
    return new Map(mine.map((reaction) => [reaction.commentId, reaction.type]));
  }

  /** The author's current score for this title, not a copy taken when they wrote. */
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

  /** Threads are one level deep: you reply to a comment, not to a reply. */
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
