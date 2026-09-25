import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CastCreditService } from "./cast-credit.service";

describe("CastCreditService", () => {
  let service: CastCreditService;
  let prismaMock: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CastCreditService,
        {
          provide: PrismaService,
          useValue: {
            title: {
              findUnique: jest.fn(),
            },
            castCredit: {
              findMany: jest.fn(),
              deleteMany: jest.fn(),
              createMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CastCreditService>(CastCreditService);
    prismaMock = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCast", () => {
    describe("when the title does not exist", () => {
      beforeEach(() => {
        (prismaMock.title.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.getCast("non-existent");
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when the title exists", () => {
      const credits = [
        {
          id: "credit-1",
          character: "Neo",
          order: 0,
          artist: { id: "artist-1", name: "Keanu Reeves" },
        },
      ];

      beforeEach(() => {
        (prismaMock.title.findUnique as jest.Mock).mockResolvedValue({ id: "title-1" });
        (prismaMock.castCredit.findMany as jest.Mock).mockResolvedValue(credits);
      });

      test("should return the cast ordered for display", async () => {
        const result = await service.getCast("title-1");
        expect(prismaMock.castCredit.findMany).toHaveBeenCalledWith({
          where: { titleId: "title-1" },
          include: { artist: true },
          orderBy: { order: "asc" },
        });
        expect(result).toEqual([
          { id: "credit-1", character: "Neo", order: 0, artist: credits[0].artist },
        ]);
      });
    });
  });

  describe("setCast", () => {
    describe("when the title does not exist", () => {
      beforeEach(() => {
        (prismaMock.title.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.setCast("non-existent", [{ artistId: "artist-1" }]);
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when one or more artistId values do not exist", () => {
      beforeEach(() => {
        (prismaMock.title.findUnique as jest.Mock).mockResolvedValue({ id: "title-1" });
        (prismaMock.$transaction as jest.Mock).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
            code: "P2003",
            clientVersion: "test",
          }),
        );
      });

      test("should throw BadRequestException instead of the raw Prisma error", async () => {
        const action = service.setCast("title-1", [{ artistId: "non-existent" }]);
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when the credits are valid", () => {
      const credits = [
        {
          id: "credit-1",
          character: "Neo",
          order: 0,
          artist: { id: "artist-1", name: "Keanu Reeves" },
        },
      ];

      beforeEach(() => {
        (prismaMock.title.findUnique as jest.Mock).mockResolvedValue({ id: "title-1" });
        (prismaMock.$transaction as jest.Mock).mockResolvedValue([{ count: 0 }, { count: 1 }]);
        (prismaMock.castCredit.findMany as jest.Mock).mockResolvedValue(credits);
      });

      test("should replace the cast and return the fresh list", async () => {
        const result = await service.setCast("title-1", [
          { artistId: "artist-1", character: "Neo" },
        ]);

        expect(prismaMock.castCredit.deleteMany).toHaveBeenCalledWith({
          where: { titleId: "title-1" },
        });
        expect(prismaMock.castCredit.createMany).toHaveBeenCalledWith({
          data: [{ titleId: "title-1", artistId: "artist-1", character: "Neo", order: 0 }],
        });
        expect(result).toEqual([
          { id: "credit-1", character: "Neo", order: 0, artist: credits[0].artist },
        ]);
      });
    });
  });
});
