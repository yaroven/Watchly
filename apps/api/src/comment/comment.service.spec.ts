import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ReactionType, Role } from "@prisma/client";
import { EngagementCountersService } from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReportService } from "../report/report.service";
import { S3Service } from "../s3/s3.service";
import { VoteStateService } from "../vote-cache/vote-state.service";
import { CommentService } from "./comment.service";
import { replySubject, titleSubject } from "./utils/comment-subject.const";

describe("CommentService", () => {
  let service: CommentService;
  let voteStateMock: { forComments: jest.Mock };
  let prismaMock: jest.Mocked<PrismaService>;
  let txMock: {
    comment: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
    };
    report: { deleteMany: jest.Mock };
    reaction: { deleteMany: jest.Mock };
    engagementCounters: { findMany: jest.Mock; upsert: jest.Mock; deleteMany: jest.Mock };
  };

  const titleId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";
  const commentId = "33333333-3333-4333-8333-333333333333";

  const author = { id: userId, email: "viewer@example.com", displayName: null, avatarKey: null };
  const rootComment = {
    id: commentId,
    titleId,
    userId,
    text: "Held up better than I expected",
    hasSpoiler: false,
    parentId: null,
    createdAt: new Date("2026-01-01"),
    user: author,
  };

  beforeEach(async () => {
    txMock = {
      comment: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ titleId, parentId: null }),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
      report: { deleteMany: jest.fn() },
      engagementCounters: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ likes: 0, dislikes: 0, commentCount: 0 }),
        deleteMany: jest.fn(),
      },
      reaction: { deleteMany: jest.fn() },
    };

    voteStateMock = { forComments: jest.fn().mockResolvedValue(new Map()) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: VoteStateService, useValue: voteStateMock },
        ReportService,
        EngagementCountersService,
        {
          provide: S3Service,
          useValue: { getPublicUrl: jest.fn((key: string) => `https://cdn.test/${key}`) },
        },
        {
          provide: PrismaService,
          useValue: {
            title: { findUnique: jest.fn() },
            comment: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
              groupBy: jest.fn(),
            },
            reaction: {
              findMany: jest.fn(),
              groupBy: jest.fn(),
              deleteMany: jest.fn(),
              upsert: jest.fn(),
            },
            report: { upsert: jest.fn(), deleteMany: jest.fn() },
            engagementCounters: {
              findMany: jest.fn().mockResolvedValue([]),
              upsert: jest.fn().mockResolvedValue({ likes: 0, dislikes: 0, commentCount: 0 }),
              deleteMany: jest.fn(),
            },
            titleRating: { findMany: jest.fn() },
            $queryRaw: jest.fn(),
            $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(txMock)),
          },
        },
      ],
    }).compile();

    service = module.get(CommentService);
    prismaMock = module.get(PrismaService) as jest.Mocked<PrismaService>;

    (prismaMock.title.findUnique as jest.Mock).mockResolvedValue({ id: titleId });
    (prismaMock.comment.count as jest.Mock).mockResolvedValue(1);
    (prismaMock.reaction.groupBy as jest.Mock).mockResolvedValue([]);
    (prismaMock.reaction.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.titleRating.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.comment.groupBy as jest.Mock).mockResolvedValue([]);
    (prismaMock.$queryRaw as unknown as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  describe("findForSubject", () => {
    const mockPage = (
      roots: Record<string, unknown>[] = [rootComment],
      replies: Record<string, unknown>[] = [],
    ) => {
      (prismaMock.$queryRaw as unknown as jest.Mock).mockResolvedValue(
        replies.map((reply) => ({ id: reply.id as string })),
      );
      (prismaMock.comment.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(roots.map((root) => ({ id: root.id as string })))
        .mockResolvedValueOnce(roots)
        .mockResolvedValueOnce(replies);
    };

    beforeEach(() => mockPage());

    describe("should nest replies under their parent", () => {
      it("if the page has any", async () => {
        const reply = { ...rootComment, id: "reply-1", parentId: commentId, text: "Agreed" };

        mockPage(
          [{ ...rootComment, counters: { likes: 0, dislikes: 0, commentCount: 7 } }],
          [reply],
        );

        const { items } = await service.findForSubject(titleSubject(titleId), {
          page: 1,
          limit: 10,
        });

        expect(items).toHaveLength(1);
        expect(items[0].replies).toHaveLength(1);
        expect(items[0].replies[0].text).toBe("Agreed");
        expect(items[0].replyCount).toBe(7);
      });
    });

    describe("should fall back to the email local part", () => {
      it("if the author never set a display name", async () => {
        const { items } = await service.findForSubject(titleSubject(titleId), {
          page: 1,
          limit: 10,
        });

        expect(items[0].author.name).toBe("viewer");
      });
    });

    describe("should show the author's current score", () => {
      it("if they have rated the title", async () => {
        mockPage([{ ...rootComment, user: { ...author, ratings: [{ score: 8 }] } }]);

        const { items } = await service.findForSubject(titleSubject(titleId), {
          page: 1,
          limit: 10,
        });

        expect(items[0].author.score).toBe(8);
      });

      it("asking for it in the same read, scoped to this title", async () => {
        await service.findForSubject(titleSubject(titleId), { page: 1, limit: 10 });

        const [{ include }] = (prismaMock.comment.findMany as jest.Mock).mock.calls[1] as [
          { include: { user: { select: Record<string, unknown> } } },
        ];
        expect(include.user.select.ratings).toEqual({
          where: { titleId },
          select: { score: true },
        });
      });

      it("and not asking at all for a thread that is not a title's", async () => {
        (prismaMock.comment.findUnique as jest.Mock).mockResolvedValue({
          titleId: null,
          parentId: "root-1",
        });
        (prismaMock.comment.findMany as jest.Mock).mockReset().mockResolvedValue([]);

        await service.findReplies(commentId, { page: 1, limit: 10 });

        const calls = (prismaMock.comment.findMany as jest.Mock).mock.calls as [
          { include: { user: { select: Record<string, unknown> } } },
        ][];
        for (const [{ include }] of calls) {
          expect(include.user.select).not.toHaveProperty("ratings");
        }
      });
    });

    describe("should report no reaction of their own", () => {
      it("if the caller is anonymous, without querying for one", async () => {
        const { items } = await service.findForSubject(titleSubject(titleId), {
          page: 1,
          limit: 10,
        });

        expect(items[0].myReaction).toBeNull();
        expect(prismaMock.reaction.findMany).not.toHaveBeenCalled();

        expect(voteStateMock.forComments).toHaveBeenCalledWith(expect.anything(), undefined);
      });
    });

    describe("should take the viewer's vote from the cache", () => {
      it("in preference to the relation the page loaded", async () => {
        mockPage();
        voteStateMock.forComments.mockResolvedValue(new Map([[commentId, ReactionType.DISLIKE]]));

        const { items } = await service.findForSubject(
          titleSubject(titleId),
          { page: 1, limit: 10 },
          "viewer-1",
        );

        expect(items[0].myReaction).toBe(ReactionType.DISLIKE);
      });

      it("asking for roots and previewed replies in one call", async () => {
        mockPage();

        await service.findForSubject(titleSubject(titleId), { page: 1, limit: 10 }, "viewer-1");

        expect(voteStateMock.forComments).toHaveBeenCalledTimes(1);
      });
    });

    describe("should cap the replies it ships", () => {
      it("so one busy thread cannot bloat the page", async () => {
        mockPage();

        await service.findForSubject(titleSubject(titleId), { page: 1, limit: 10 });

        const [query] = (prismaMock.$queryRaw as unknown as jest.Mock).mock.calls.at(-1) as [
          { sql: string; values: unknown[] },
        ];
        expect(query.sql).toContain("ROW_NUMBER()");
        expect(query.values).toContain(3);
      });
    });

    describe("should rank by likes alone", () => {
      it("if sorting by hottest, since a dislike pile-on is not popularity", async () => {
        (prismaMock.$queryRaw as unknown as jest.Mock)
          .mockResolvedValueOnce([{ id: commentId }])
          .mockResolvedValue([]);
        (prismaMock.comment.findMany as jest.Mock)
          .mockReset()
          .mockResolvedValueOnce([rootComment])
          .mockResolvedValueOnce([]);

        const { items } = await service.findForSubject(titleSubject(titleId), {
          page: 1,
          limit: 10,
          sort: "hottest",
        });

        expect(prismaMock.$queryRaw).toHaveBeenCalled();
        expect(items[0].id).toBe(commentId);
      });
    });
  });

  describe("create", () => {
    beforeEach(() => {
      txMock.comment.create.mockResolvedValue(rootComment);
    });

    describe("should throw BadRequestException", () => {
      it("if replying to a reply, since threads are one level deep", async () => {
        (prismaMock.comment.findUnique as jest.Mock).mockResolvedValue(
          replySubject("some-other-comment"),
        );

        const action = service.create(replySubject(commentId), userId, { text: "hi" });

        await expect(action).rejects.toThrow(BadRequestException);
        expect(txMock.comment.create).not.toHaveBeenCalled();
      });

      it("if the thread the reply resolves to is not the one the caller named", async () => {
        (prismaMock.comment.findUnique as jest.Mock).mockResolvedValue(
          titleSubject("44444444-4444-4444-8444-444444444444"),
        );

        const action = service.create(
          replySubject(commentId),
          userId,
          { text: "hi" },
          titleSubject(titleId),
        );

        await expect(action).rejects.toThrow(BadRequestException);
        expect(txMock.comment.create).not.toHaveBeenCalled();
      });
    });

    describe("should store the spoiler flag", () => {
      it("instead of leaving the warning to the text", async () => {
        await service.create(titleSubject(titleId), userId, {
          text: "the dog dies",
          hasSpoiler: true,
        });

        expect(txMock.comment.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ hasSpoiler: true }),
          }),
        );
      });
    });
  });

  describe("report", () => {
    describe("should replace the previous reason", () => {
      it("rather than failing on the second report from the same viewer", async () => {
        (prismaMock.comment.findUnique as jest.Mock).mockResolvedValue({ id: commentId });

        await service.report(commentId, userId, "spam");

        expect(prismaMock.report.upsert).toHaveBeenCalledWith({
          where: { commentId_userId: { commentId, userId } },
          create: { commentId, userId, reason: "spam" },
          update: { reason: "spam" },
        });
      });
    });

    describe("should throw NotFoundException", () => {
      it("if the comment is gone", async () => {
        (prismaMock.comment.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(service.report(commentId, userId)).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe("the hottest sort", () => {
    it("should rank on the cached like counter, joined by the comment arc", async () => {
      await service.findForSubject(titleSubject(titleId), { sort: "hottest" });

      const [query] = (prismaMock.$queryRaw as unknown as jest.Mock).mock.calls[0] as [
        { sql: string; values: unknown[] },
      ];

      expect(query.sql).toContain('"EngagementCounters"');
      expect(query.sql).toContain('e."commentId" = c."id"');
      expect(query.sql).toContain('c."titleId"');

      expect(query.values).toContain(titleId);
    });
  });

  describe("remove", () => {
    describe("should throw ForbiddenException", () => {
      it("if the comment belongs to someone else and the caller is not an admin", async () => {
        (prismaMock.comment.findUnique as jest.Mock).mockResolvedValue({
          userId: "someone-else",
        });

        const action = service.remove(commentId, userId, Role.USER);

        await expect(action).rejects.toThrow(ForbiddenException);
        expect(txMock.comment.deleteMany).not.toHaveBeenCalled();
      });
    });

    describe("should delete it anyway", () => {
      it("if the caller is an admin", async () => {
        (prismaMock.comment.findUnique as jest.Mock).mockResolvedValue({
          userId: "someone-else",
        });

        await service.remove(commentId, userId, Role.ADMIN);

        expect(txMock.comment.delete).toHaveBeenCalledWith({ where: { id: commentId } });
      });
    });

    describe("should let the database take the rest", () => {
      it("deleting the row and recomputing the parent's count", async () => {
        (prismaMock.comment.findUnique as jest.Mock).mockResolvedValue({
          userId,
          titleId,
          parentId: null,
        });

        await service.remove(commentId, userId, Role.USER);

        expect(txMock.comment.delete).toHaveBeenCalledWith({ where: { id: commentId } });
        expect(txMock.engagementCounters.upsert).toHaveBeenCalledWith(
          expect.objectContaining({ where: { titleId } }),
        );
      });

      it("in one transaction, not on the base client", async () => {
        (prismaMock.comment.findUnique as jest.Mock).mockResolvedValue({
          userId,
          titleId,
          parentId: null,
        });

        await service.remove(commentId, userId, Role.USER);

        expect(prismaMock.comment.delete).not.toHaveBeenCalled();
      });
    });
  });
});
