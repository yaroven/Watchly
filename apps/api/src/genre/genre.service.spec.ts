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
    describe("should create and return the genre", () => {
      it("if the name is unique", async () => {
        const createdGenre = { id: "genre-1", name: "Action" };
        (prismaMock.genre.create as jest.Mock).mockResolvedValue(createdGenre);

        const result = await service.create({ name: "Action" });

        expect(prismaMock.genre.create).toHaveBeenCalledWith({ data: { name: "Action" } });
        expect(result).toEqual(createdGenre);
      });
    });

    describe("should throw BadRequestException instead of the raw Prisma error", () => {
      it("if the name already exists", async () => {
        (prismaMock.genre.create as jest.Mock).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "test",
          }),
        );

        const action = service.create({ name: "Action" });

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe("findAll", () => {
    describe("should return paginated genres", () => {
      it("if fetching without filters", async () => {
        const genres = [{ id: "genre-1", name: "Action" }];
        (prismaMock.genre.findMany as jest.Mock).mockResolvedValue(genres);
        (prismaMock.genre.count as jest.Mock).mockResolvedValue(1);

        const result = await service.findAll({ page: 1, limit: 10 });

        expect(prismaMock.genre.findMany).toHaveBeenCalledWith({
          where: {},
          skip: 0,
          take: 10,
          orderBy: { createdAt: "desc" },
        });
        expect(result).toEqual({ items: genres, totalCount: 1 });
      });
    });

    describe("should filter by substring match", () => {
      it("if filtering by name (LIKE)", async () => {
        (prismaMock.genre.findMany as jest.Mock).mockResolvedValue([]);
        (prismaMock.genre.count as jest.Mock).mockResolvedValue(0);

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
  });

  describe("findOne", () => {
    describe("should return the genre", () => {
      it("if it exists", async () => {
        const genre = { id: "genre-1", name: "Action" };
        (prismaMock.genre.findUnique as jest.Mock).mockResolvedValue(genre);

        const result = await service.findOne("genre-1");

        expect(prismaMock.genre.findUnique).toHaveBeenCalledWith({ where: { id: "genre-1" } });
        expect(result).toEqual(genre);
      });
    });

    describe("should return null", () => {
      it("if it does not exist", async () => {
        (prismaMock.genre.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await service.findOne("non-existent");

        expect(result).toBeNull();
      });
    });
  });

  describe("update", () => {
    describe("should throw BadRequestException", () => {
      it("if the genre does not exist", async () => {
        (prismaMock.genre.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.update("non-existent", { name: "New Name" });

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("should update and return the genre", () => {
      it("if the genre exists", async () => {
        const genre = { id: "genre-1", name: "Action" };
        const updated = { ...genre, name: "Adventure" };
        (prismaMock.genre.findUnique as jest.Mock).mockResolvedValue(genre);
        (prismaMock.genre.update as jest.Mock).mockResolvedValue(updated);

        const result = await service.update("genre-1", { name: "Adventure" });

        expect(prismaMock.genre.update).toHaveBeenCalledWith({
          where: { id: "genre-1" },
          data: { name: "Adventure" },
        });
        expect(result).toEqual(updated);
      });
    });

    describe("should throw BadRequestException instead of the raw Prisma error", () => {
      it("if renaming to a name that already exists", async () => {
        const genre = { id: "genre-1", name: "Action" };
        (prismaMock.genre.findUnique as jest.Mock).mockResolvedValue(genre);
        (prismaMock.genre.update as jest.Mock).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "test",
          }),
        );

        const action = service.update("genre-1", { name: "Adventure" });

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe("delete", () => {
    describe("should throw BadRequestException", () => {
      it("if the genre does not exist", async () => {
        (prismaMock.genre.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.delete("non-existent");

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("should delete and return the genre", () => {
      it("if the genre exists", async () => {
        const genre = { id: "genre-1", name: "Action" };
        (prismaMock.genre.findUnique as jest.Mock).mockResolvedValue(genre);
        (prismaMock.genre.delete as jest.Mock).mockResolvedValue(genre);

        const result = await service.delete("genre-1");

        expect(prismaMock.genre.delete).toHaveBeenCalledWith({ where: { id: "genre-1" } });
        expect(result).toEqual(genre);
      });
    });
  });
});
