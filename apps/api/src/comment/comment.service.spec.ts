import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ReactionType, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CommentService } from "./comment.service";

describe("CommentService", () => {
  let service: CommentService;
  let prismaMock: jest.Mocked<PrismaService>;

  const titleId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";
  const commentId = "33333333-3333-4333-8333-333333333333";

  const author = { id: userId, email: "viewer@example.com", displayName: null, avatarUrl: null };
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: PrismaService,
          useValue: {
            title: { findUnique: jest.fn() },
            titleComment: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              groupBy: jest.fn(),
            },
            commentReaction: {
              findMany: jest.fn(),
              groupBy: jest.fn(),
              deleteMany: jest.fn(),
              upsert: jest.fn(),
            },
            commentReport: { upsert: jest.fn() },
            titleRating: { findMany: jest.fn() },
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CommentService);
    prismaMock = module.get(PrismaService) as jest.Mocked<PrismaService>;

    (prismaMock.title.findUnique as jest.Mock).mockResolvedValue({ id: titleId });
    (prismaMock.titleComment.count as jest.Mock).mockResolvedValue(1);
    (prismaMock.commentReaction.groupBy as jest.Mock).mockResolvedValue([]);
    (prismaMock.commentReaction.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.titleRating.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.titleComment.groupBy as jest.Mock).mockResolvedValue([]);
    (prismaMock.$queryRaw as unknown as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  describe("findForTitle", () => {
    const mockPage = (roots = [rootComment], replies: { id: string }[] = []) => {
      (prismaMock.$queryRaw as unknown as jest.Mock).mockResolvedValue(
        replies.map((reply) => ({ id: reply.id })),
      );
      (prismaMock.titleComment.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(roots.map((root) => ({ id: root.id })))
        .mockResolvedValueOnce(roots)
        .mockResolvedValueOnce(replies);
    };

    beforeEach(() => mockPage());

    describe("should nest replies under their parent", () => {
      it("if the page has any", async () => {
        const reply = { ...rootComment, id: "reply-1", parentId: commentId, text: "Agreed" };
        mockPage([rootComment], [reply]);
        (prismaMock.titleComment.groupBy as jest.Mock).mockResolvedValue([
          { parentId: commentId, _count: { _all: 7 } },
        ]);

        const { items } = await service.findForTitle(titleId, { page: 1, limit: 10 });

        expect(items).toHaveLength(1);
        expect(items[0].replies).toHaveLength(1);
        expect(items[0].replies[0].text).toBe("Agreed");
        expect(items[0].replyCount).toBe(7);
      });
    });

    describe("should fall back to the email local part", () => {
      it("if the author never set a display name", async () => {
        const { items } = await service.findForTitle(titleId, { page: 1, limit: 10 });

        expect(items[0].author.name).toBe("viewer");
      });
    });

    describe("should show the author's current score", () => {
      it("if they have rated the title", async () => {
        (prismaMock.titleRating.findMany as jest.Mock).mockResolvedValue([{ userId, score: 8 }]);

        const { items } = await service.findForTitle(titleId, { page: 1, limit: 10 });

        expect(items[0].author.score).toBe(8);
      });
    });

    describe("should report no reaction of their own", () => {
      it("if the caller is anonymous, without querying for one", async () => {
        const { items } = await service.findForTitle(titleId, { page: 1, limit: 10 });

        expect(items[0].myReaction).toBeNull();
        expect(prismaMock.commentReaction.findMany).not.toHaveBeenCalled();
      });
    });

    describe("should cap the replies it ships", () => {
      it("so one busy thread cannot bloat the page", async () => {
        mockPage();

        await service.findForTitle(titleId, { page: 1, limit: 10 });

        const [query] = (prismaMock.$queryRaw as unknown as jest.Mock).mock.calls.at(-1)!;
        expect(query.join("")).toContain("ROW_NUMBER()");
      });
    });

    describe("should rank by likes alone", () => {
      it("if sorting by hottest, since a dislike pile-on is not popularity", async () => {
        (prismaMock.$queryRaw as unknown as jest.Mock)
          .mockResolvedValueOnce([{ id: commentId }])
          .mockResolvedValue([]);
        (prismaMock.titleComment.findMany as jest.Mock)
          .mockReset()
          .mockResolvedValueOnce([rootComment])
          .mockResolvedValueOnce([]);

        const { items } = await service.findForTitle(titleId, {
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
      (prismaMock.titleComment.create as jest.Mock).mockResolvedValue(rootComment);
    });

    describe("should throw BadRequestException", () => {
      it("if replying to a reply, since threads are one level deep", async () => {
        (prismaMock.titleComment.findUnique as jest.Mock).mockResolvedValue({
          titleId,
          parentId: "some-other-comment",
        });

        const action = service.create(titleId, userId, { text: "hi", parentId: commentId });

        await expect(action).rejects.toThrow(BadRequestException);
        expect(prismaMock.titleComment.create).not.toHaveBeenCalled();
      });

      it("if the parent belongs to a different title", async () => {
        (prismaMock.titleComment.findUnique as jest.Mock).mockResolvedValue({
          titleId: "44444444-4444-4444-8444-444444444444",
          parentId: null,
        });

        const action = service.create(titleId, userId, { text: "hi", parentId: commentId });

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("should store the spoiler flag", () => {
      it("instead of leaving the warning to the text", async () => {
        await service.create(titleId, userId, { text: "the dog dies", hasSpoiler: true });

        expect(prismaMock.titleComment.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ hasSpoiler: true }),
          }),
        );
      });
    });
  });

  describe("react", () => {
    beforeEach(() => {
      (prismaMock.titleComment.findUnique as jest.Mock).mockResolvedValue({ id: commentId });
      (prismaMock.commentReaction.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    });

    describe("should withdraw the vote", () => {
      it("if the same reaction is sent twice, without writing a row", async () => {
        (prismaMock.commentReaction.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

        const result = await service.react(commentId, userId, ReactionType.LIKE);

        expect(prismaMock.commentReaction.deleteMany).toHaveBeenCalledWith({
          where: { commentId, userId, type: ReactionType.LIKE },
        });
        expect(prismaMock.commentReaction.upsert).not.toHaveBeenCalled();
        expect(result.myReaction).toBeNull();
      });
    });

    describe("should record the vote", () => {
      it("if the viewer had not reacted, or had voted the other way", async () => {
        const result = await service.react(commentId, userId, ReactionType.DISLIKE);

        expect(prismaMock.commentReaction.upsert).toHaveBeenCalledWith({
          where: { commentId_userId: { commentId, userId } },
          create: { commentId, userId, type: ReactionType.DISLIKE },
          update: { type: ReactionType.DISLIKE },
        });
        expect(result.myReaction).toBe(ReactionType.DISLIKE);
      });
    });

    describe("should not read the row before writing", () => {
      it("so two clicks racing cannot both decide the row is missing", async () => {
        await service.react(commentId, userId, ReactionType.LIKE);

        expect(prismaMock.titleComment.findUnique).toHaveBeenCalledTimes(1);
      });
    });

    describe("should split the counts by type", () => {
      it("so likes and dislikes are reported separately", async () => {
        (prismaMock.commentReaction.groupBy as jest.Mock).mockResolvedValue([
          { commentId, type: ReactionType.LIKE, _count: { _all: 3 } },
          { commentId, type: ReactionType.DISLIKE, _count: { _all: 1 } },
        ]);

        const result = await service.react(commentId, userId, ReactionType.LIKE);

        expect(result).toEqual({ likes: 3, dislikes: 1, myReaction: ReactionType.LIKE });
      });
    });
  });

  describe("report", () => {
    describe("should replace the previous reason", () => {
      it("rather than failing on the second report from the same viewer", async () => {
        (prismaMock.titleComment.findUnique as jest.Mock).mockResolvedValue({ id: commentId });

        await service.report(commentId, userId, "spam");

        expect(prismaMock.commentReport.upsert).toHaveBeenCalledWith({
          where: { commentId_userId: { commentId, userId } },
          create: { commentId, userId, reason: "spam" },
          update: { reason: "spam" },
        });
      });
    });

    describe("should throw NotFoundException", () => {
      it("if the comment is gone", async () => {
        (prismaMock.titleComment.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(service.report(commentId, userId)).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe("remove", () => {
    describe("should throw ForbiddenException", () => {
      it("if the comment belongs to someone else and the caller is not an admin", async () => {
        (prismaMock.titleComment.findUnique as jest.Mock).mockResolvedValue({
          userId: "someone-else",
        });

        const action = service.remove(commentId, userId, Role.USER);

        await expect(action).rejects.toThrow(ForbiddenException);
        expect(prismaMock.titleComment.delete).not.toHaveBeenCalled();
      });
    });

    describe("should delete it anyway", () => {
      it("if the caller is an admin", async () => {
        (prismaMock.titleComment.findUnique as jest.Mock).mockResolvedValue({
          userId: "someone-else",
        });

        await service.remove(commentId, userId, Role.ADMIN);

        expect(prismaMock.titleComment.delete).toHaveBeenCalledWith({ where: { id: commentId } });
      });
    });
  });
});
