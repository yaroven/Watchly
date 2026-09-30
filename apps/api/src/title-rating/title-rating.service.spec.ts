import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { TitleRatingService } from "./title-rating.service";

describe("TitleRatingService", () => {
  let service: TitleRatingService;
  let prismaMock: jest.Mocked<PrismaService>;

  const titleId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TitleRatingService,
        {
          provide: PrismaService,
          useValue: {
            title: { findUnique: jest.fn() },
            titleRating: {
              upsert: jest.fn(),
              deleteMany: jest.fn(),
              aggregate: jest.fn(),
              findUnique: jest.fn(),
              groupBy: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(TitleRatingService);
    prismaMock = module.get(PrismaService) as jest.Mocked<PrismaService>;

    (prismaMock.title.findUnique as jest.Mock).mockResolvedValue({ id: titleId });
    (prismaMock.titleRating.aggregate as jest.Mock).mockResolvedValue({
      _avg: { score: 7.25 },
      _count: { _all: 4 },
    });
    (prismaMock.titleRating.findUnique as jest.Mock).mockResolvedValue({ score: 9 });
  });

  afterEach(() => jest.clearAllMocks());

  describe("set", () => {
    describe("should replace the existing score rather than add a second one", () => {
      it("if the viewer already rated the title", async () => {
        await service.set(titleId, userId, 8);

        expect(prismaMock.titleRating.upsert).toHaveBeenCalledWith({
          where: { titleId_userId: { titleId, userId } },
          create: { titleId, userId, score: 8 },
          update: { score: 8 },
        });
      });
    });

    describe("should throw BadRequestException", () => {
      it("if the title does not exist", async () => {
        (prismaMock.title.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(service.set(titleId, userId, 8)).rejects.toThrow(BadRequestException);
        expect(prismaMock.titleRating.upsert).not.toHaveBeenCalled();
      });
    });
  });

  describe("remove", () => {
    describe("should throw NotFoundException", () => {
      it("if the viewer had not rated the title", async () => {
        (prismaMock.titleRating.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

        await expect(service.remove(titleId, userId)).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe("summarize", () => {
    describe("should round the average to one decimal", () => {
      it("so it matches the number the UI renders", async () => {
        const result = await service.summarize(titleId, userId);

        expect(result.average).toBe(7.3);
        expect(result.count).toBe(4);
        expect(result.myScore).toBe(9);
      });
    });

    describe("should report no personal score", () => {
      it("if the caller is anonymous, without querying for one", async () => {
        const result = await service.summarize(titleId);

        expect(result.myScore).toBeNull();
        expect(prismaMock.titleRating.findUnique).not.toHaveBeenCalled();
      });
    });

    describe("should return a null average", () => {
      it("if nobody has rated the title yet", async () => {
        (prismaMock.titleRating.aggregate as jest.Mock).mockResolvedValue({
          _avg: { score: null },
          _count: { _all: 0 },
        });

        const result = await service.summarize(titleId);

        expect(result.average).toBeNull();
        expect(result.count).toBe(0);
      });
    });
  });

  describe("summarizeMany", () => {
    describe("should not query at all", () => {
      it("if given no title ids", async () => {
        const result = await service.summarizeMany([]);

        expect(result.size).toBe(0);
        expect(prismaMock.titleRating.groupBy).not.toHaveBeenCalled();
      });
    });

    describe("should key the averages by title", () => {
      it("so a list can be resolved in one query", async () => {
        (prismaMock.titleRating.groupBy as jest.Mock).mockResolvedValue([
          { titleId, _avg: { score: 6.66 }, _count: { _all: 3 } },
        ]);

        const result = await service.summarizeMany([titleId]);

        expect(result.get(titleId)).toEqual({ average: 6.7, count: 3 });
      });
    });
  });
});
