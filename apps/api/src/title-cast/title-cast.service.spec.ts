import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import { TitleCastService } from "./title-cast.service";

describe("TitleCastService", () => {
  let service: TitleCastService;
  let prismaMock: {
    castCredit: { findMany: jest.Mock; deleteMany: jest.Mock; createMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const titleId = "title-1";
  const credits = [
    {
      id: "credit-1",
      character: "Neo",
      order: 0,
      artist: { id: "artist-1", name: "Keanu Reeves" },
    },
  ];
  const expected = [
    {
      id: "credit-1",
      character: "Neo",
      order: 0,
      artist: { ...credits[0].artist, photoUrl: null },
    },
  ];

  beforeEach(async () => {
    prismaMock = {
      castCredit: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn().mockResolvedValue([{ count: 0 }, { count: 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TitleCastService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PosterService, useValue: { toPublicUrl: jest.fn().mockReturnValue(null) } },
      ],
    }).compile();

    service = module.get(TitleCastService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("findForTitle", () => {
    it("should return the cast ordered for display", async () => {
      prismaMock.castCredit.findMany.mockResolvedValue(credits);

      const result = await service.findForTitle(titleId);

      expect(prismaMock.castCredit.findMany).toHaveBeenCalledWith({
        where: { titleId },
        include: { artist: true },
        orderBy: { order: "asc" },
      });
      expect(result).toEqual(expected);
    });
  });

  describe("replaceForTitle", () => {
    it("should translate a foreign key failure instead of leaking the Prisma error", async () => {
      prismaMock.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
          code: "P2003",
          clientVersion: "test",
        }),
      );

      await expect(
        service.replaceForTitle(titleId, [{ artistId: "non-existent" }]),
      ).rejects.toThrow(BadRequestException);
    });

    it("should replace the cast and return the fresh list", async () => {
      prismaMock.castCredit.findMany.mockResolvedValue(credits);

      const result = await service.replaceForTitle(titleId, [
        { artistId: "artist-1", character: "Neo" },
      ]);

      expect(prismaMock.castCredit.deleteMany).toHaveBeenCalledWith({ where: { titleId } });
      expect(prismaMock.castCredit.createMany).toHaveBeenCalledWith({
        data: [{ titleId, artistId: "artist-1", character: "Neo", order: 0 }],
      });
      expect(result).toEqual(expected);
    });

    it("should default a credit's order to its array position", async () => {
      await service.replaceForTitle(titleId, [{ artistId: "artist-1" }, { artistId: "artist-2" }]);

      expect(prismaMock.castCredit.createMany).toHaveBeenCalledWith({
        data: [
          { titleId, artistId: "artist-1", character: undefined, order: 0 },
          { titleId, artistId: "artist-2", character: undefined, order: 1 },
        ],
      });
    });
  });
});
