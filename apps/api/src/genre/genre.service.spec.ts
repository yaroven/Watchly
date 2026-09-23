import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { FilterRule } from "../common/pagination/filter-rule.enum";
import { PrismaService } from "../prisma/prisma.service";
import { GenreService } from "./genre.service";

describe("GenreService", () => {
  let service: GenreService;
  let prismaMock: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenreService,
        {
          provide: PrismaService,
          useValue: {
            genre: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<GenreService>(GenreService);
    prismaMock = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    describe("when name is unique", () => {
      const createdGenre = { id: "genre-1", name: "Action" };

      beforeEach(() => {
        (prismaMock.genre.create as jest.Mock).mockResolvedValue(createdGenre);
      });

      test("should create and return the genre", async () => {
        const result = await service.create({ name: "Action" });
        expect(prismaMock.genre.create).toHaveBeenCalledWith({ data: { name: "Action" } });
        expect(result).toEqual(createdGenre);
      });
    });

    describe("when name already exists", () => {
      beforeEach(() => {
        (prismaMock.genre.create as jest.Mock).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "test",
          }),
        );
      });

      test("should throw BadRequestException instead of the raw Prisma error", async () => {
        const action = service.create({ name: "Action" });
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe("findAll", () => {
    const genres = [{ id: "genre-1", name: "Action" }];

    beforeEach(() => {
      (prismaMock.genre.findMany as jest.Mock).mockResolvedValue(genres);
      (prismaMock.genre.count as jest.Mock).mockResolvedValue(1);
    });

    test("should return paginated genres", async () => {
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(prismaMock.genre.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual({ items: genres, totalCount: 1 });
    });

    test("should filter by name (LIKE)", async () => {
      await service.findAll({ page: 1, limit: 10 }, undefined, [
        { property: "name", rule: FilterRule.LIKE, value: "Act" },
      ]);
      expect(prismaMock.genre.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: { contains: "Act", mode: "insensitive" } },
        }),
      );
    });
  });

  describe("findOne", () => {
    test("should return the genre when it exists", async () => {
      const genre = { id: "genre-1", name: "Action" };
      (prismaMock.genre.findUnique as jest.Mock).mockResolvedValue(genre);

      const result = await service.findOne("genre-1");
      expect(prismaMock.genre.findUnique).toHaveBeenCalledWith({ where: { id: "genre-1" } });
      expect(result).toEqual(genre);
    });

    test("should return null when it does not exist", async () => {
      (prismaMock.genre.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.findOne("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    describe("when genre does not exist", () => {
      beforeEach(() => {
        (prismaMock.genre.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.update("non-existent", { name: "New Name" });
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when genre exists", () => {
      const genre = { id: "genre-1", name: "Action" };
      const updated = { ...genre, name: "Adventure" };

      beforeEach(() => {
        (prismaMock.genre.findUnique as jest.Mock).mockResolvedValue(genre);
        (prismaMock.genre.update as jest.Mock).mockResolvedValue(updated);
      });

      test("should update and return the genre", async () => {
        const result = await service.update("genre-1", { name: "Adventure" });
        expect(prismaMock.genre.update).toHaveBeenCalledWith({
          where: { id: "genre-1" },
          data: { name: "Adventure" },
        });
        expect(result).toEqual(updated);
      });
    });

    describe("when renaming to a name that already exists", () => {
      const genre = { id: "genre-1", name: "Action" };

      beforeEach(() => {
        (prismaMock.genre.findUnique as jest.Mock).mockResolvedValue(genre);
        (prismaMock.genre.update as jest.Mock).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "test",
          }),
        );
      });

      test("should throw BadRequestException instead of the raw Prisma error", async () => {
        const action = service.update("genre-1", { name: "Adventure" });
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe("delete", () => {
    describe("when genre does not exist", () => {
      beforeEach(() => {
        (prismaMock.genre.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.delete("non-existent");
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when genre exists", () => {
      const genre = { id: "genre-1", name: "Action" };

      beforeEach(() => {
        (prismaMock.genre.findUnique as jest.Mock).mockResolvedValue(genre);
        (prismaMock.genre.delete as jest.Mock).mockResolvedValue(genre);
      });

      test("should delete and return the genre", async () => {
        const result = await service.delete("genre-1");
        expect(prismaMock.genre.delete).toHaveBeenCalledWith({ where: { id: "genre-1" } });
        expect(result).toEqual(genre);
      });
    });
  });
});
