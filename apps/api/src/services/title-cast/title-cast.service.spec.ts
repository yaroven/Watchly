import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { ImageService } from "../image/image.service";
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
      characterTranslations: {},
      order: 0,
      artist: { ...credits[0].artist, photoUrl: null },
      content: { locale: "en", fallback: false },
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
        { provide: ImageService, useValue: { toPublicUrl: jest.fn().mockReturnValue(null) } },
      ],
    }).compile();

    service = module.get(TitleCastService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("findForTitle", () => {
    it("should return the cast ordered for display", async () => {
      prismaMock.castCredit.findMany.mockResolvedValue(credits);

      const result = await service.findForTitle(titleId, "en");

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
        data: [
          {
            titleId,
            artistId: "artist-1",
            character: "Neo",
            characterTranslations: Prisma.DbNull,
            order: 0,
          },
        ],
      });
      expect(result).toEqual(expected);
    });

    it("should default a credit's order to its array position", async () => {
      await service.replaceForTitle(titleId, [{ artistId: "artist-1" }, { artistId: "artist-2" }]);

      expect(prismaMock.castCredit.createMany).toHaveBeenCalledWith({
        data: [
          {
            titleId,
            artistId: "artist-1",
            character: undefined,
            characterTranslations: Prisma.DbNull,
            order: 0,
          },
          {
            titleId,
            artistId: "artist-2",
            character: undefined,
            characterTranslations: Prisma.DbNull,
            order: 1,
          },
        ],
      });
    });
  });

  describe("character translations", () => {
    const translatedCredit = {
      ...credits[0],
      characterTranslations: { uk: "Нео" },
    };

    it("should serve the Ukrainian character for a uk read", async () => {
      prismaMock.castCredit.findMany.mockResolvedValue([translatedCredit]);

      const [credit] = await service.findForTitle(titleId, "uk");

      expect(credit).toMatchObject({
        character: "Нео",
        characterTranslations: { uk: "Нео" },
        content: { locale: "uk", fallback: false },
      });
    });

    it("should fall back to the English character when there is no Ukrainian one", async () => {
      prismaMock.castCredit.findMany.mockResolvedValue(credits);

      const [credit] = await service.findForTitle(titleId, "uk");

      expect(credit).toMatchObject({
        character: "Neo",
        characterTranslations: {},
        content: { locale: "en", fallback: true },
      });
    });

    it("should drop anything in the stored JSON that is not a supported translation", async () => {
      prismaMock.castCredit.findMany.mockResolvedValue([
        { ...credits[0], characterTranslations: { uk: "Нео", en: "Neo", de: "Neo", fr: 3 } },
      ]);

      const [credit] = await service.findForTitle(titleId, "en");

      expect(credit.characterTranslations).toEqual({ uk: "Нео" });
    });

    it("should keep the translations through a reorder that resends them", async () => {
      prismaMock.castCredit.findMany.mockResolvedValue([translatedCredit]);
      const [before] = await service.findForTitle(titleId, "en");

      await service.replaceForTitle(titleId, [
        { artistId: "artist-2" },
        {
          artistId: "artist-1",
          character: before.character ?? undefined,
          characterTranslations: before.characterTranslations,
        },
      ]);

      expect(prismaMock.castCredit.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ artistId: "artist-2", order: 0 }),
          expect.objectContaining({
            artistId: "artist-1",
            characterTranslations: { uk: "Нео" },
            order: 1,
          }),
        ],
      });
    });

    it("should answer a cast save in English", async () => {
      prismaMock.castCredit.findMany.mockResolvedValue([translatedCredit]);

      const [credit] = await service.replaceForTitle(titleId, [
        { artistId: "artist-1", character: "Neo", characterTranslations: { uk: "Нео" } },
      ]);

      expect(credit).toMatchObject({
        character: "Neo",
        content: { locale: "en", fallback: false },
      });
    });
  });
});
