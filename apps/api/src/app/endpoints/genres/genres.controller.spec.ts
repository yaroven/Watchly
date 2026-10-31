import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { GenreService } from "../../../services/genre/genre.service";
import { GenreExistsPipe } from "../../../services/genre/utils/genre-exists.pipe";
import { PrismaService } from "../../../services/prisma/prisma.service";
import { GenresController } from "./genres.controller";

describe("GenresController", () => {
  let controller: GenresController;
  let genreServiceMock: jest.Mocked<GenreService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenresController],
      providers: [
        GenreExistsPipe,
        {
          provide: PrismaService,
          useValue: { genre: { findUnique: jest.fn().mockResolvedValue({ id: "genre-1" }) } },
        },
        {
          provide: GenreService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GenresController>(GenresController);
    genreServiceMock = module.get(GenreService) as jest.Mocked<GenreService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    describe("should return the created genre", () => {
      it("if valid data is provided", async () => {
        const createData = { name: "Action" };
        const createdGenre = { id: "genre-1", ...createData };
        (genreServiceMock.create as jest.Mock).mockResolvedValue(createdGenre);

        const result = await controller.create(createData);

        expect(genreServiceMock.create).toHaveBeenCalledWith(createData);
        expect(result).toEqual(createdGenre);
      });
    });
  });

  describe("findAll", () => {
    describe("should return the list of genres", () => {
      it("if called with a query", async () => {
        const query = { page: 1, limit: 10 };
        const genresResponse = { items: [{ id: "genre-1" }], totalCount: 1 };
        (genreServiceMock.findAll as jest.Mock).mockResolvedValue(genresResponse);

        const result = await controller.findAll(query);

        expect(genreServiceMock.findAll).toHaveBeenCalledWith(query, undefined, undefined);
        expect(result).toEqual(genresResponse);
      });
    });
  });

  describe("findOne", () => {
    describe("should return the genre", () => {
      it("if the genre exists", async () => {
        const genre = { id: "genre-1" };
        (genreServiceMock.findOne as jest.Mock).mockResolvedValue(genre);

        const result = await controller.findOne("genre-1");

        expect(genreServiceMock.findOne).toHaveBeenCalledWith("genre-1");
        expect(result).toEqual(genre);
      });
    });

    describe("should throw NotFoundException", () => {
      it("if the genre does not exist", async () => {
        (genreServiceMock.findOne as jest.Mock).mockResolvedValue(null);

        const action = controller.findOne("non-existent");

        await expect(action).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe("update", () => {
    describe("should return the updated genre", () => {
      it("if valid data is provided", async () => {
        const updateData = { name: "Adventure" };
        const updatedGenre = { id: "genre-1", name: "Adventure" };
        (genreServiceMock.update as jest.Mock).mockResolvedValue(updatedGenre);

        const result = await controller.update("genre-1", updateData);

        expect(genreServiceMock.update).toHaveBeenCalledWith("genre-1", updateData);
        expect(result).toEqual(updatedGenre);
      });
    });
  });

  describe("delete", () => {
    describe("should return the deleted genre", () => {
      it("if called with an existing id", async () => {
        const deletedGenre = { id: "genre-1" };
        (genreServiceMock.delete as jest.Mock).mockResolvedValue(deletedGenre);

        const result = await controller.delete("genre-1");

        expect(genreServiceMock.delete).toHaveBeenCalledWith("genre-1");
        expect(result).toEqual(deletedGenre);
      });
    });
  });
});
