import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { GenreController } from "./genre.controller";
import { GenreService } from "./genre.service";

describe("GenreController", () => {
  let controller: GenreController;
  let genreServiceMock: jest.Mocked<GenreService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenreController],
      providers: [
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

    controller = module.get<GenreController>(GenreController);
    genreServiceMock = module.get(GenreService) as jest.Mocked<GenreService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createData = { name: "Action" };
    const createdGenre = { id: "genre-1", ...createData };

    beforeEach(() => {
      (genreServiceMock.create as jest.Mock).mockResolvedValue(createdGenre);
    });

    test("should return created genre", async () => {
      const result = await controller.create(createData);
      expect(genreServiceMock.create).toHaveBeenCalledWith(createData);
      expect(result).toEqual(createdGenre);
    });
  });

  describe("findAll", () => {
    const query = { page: 1, limit: 10 };
    const genresResponse = { items: [{ id: "genre-1" }], totalCount: 1 };

    beforeEach(() => {
      (genreServiceMock.findAll as jest.Mock).mockResolvedValue(genresResponse);
    });

    test("should return list of genres", async () => {
      const result = await controller.findAll(query);
      expect(genreServiceMock.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(genresResponse);
    });
  });

  describe("findOne", () => {
    describe("when genre exists", () => {
      const genre = { id: "genre-1" };

      beforeEach(() => {
        (genreServiceMock.findOne as jest.Mock).mockResolvedValue(genre);
      });

      test("should return the genre", async () => {
        const result = await controller.findOne("genre-1");
        expect(genreServiceMock.findOne).toHaveBeenCalledWith("genre-1");
        expect(result).toEqual(genre);
      });
    });

    describe("when genre does not exist", () => {
      beforeEach(() => {
        (genreServiceMock.findOne as jest.Mock).mockResolvedValue(null);
      });

      test("should throw NotFoundException", async () => {
        const action = controller.findOne("non-existent");
        await expect(action).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe("update", () => {
    const updateData = { name: "Adventure" };
    const updatedGenre = { id: "genre-1", name: "Adventure" };

    beforeEach(() => {
      (genreServiceMock.update as jest.Mock).mockResolvedValue(updatedGenre);
    });

    test("should return updated genre", async () => {
      const result = await controller.update("genre-1", updateData);
      expect(genreServiceMock.update).toHaveBeenCalledWith("genre-1", updateData);
      expect(result).toEqual(updatedGenre);
    });
  });

  describe("delete", () => {
    const deletedGenre = { id: "genre-1" };

    beforeEach(() => {
      (genreServiceMock.delete as jest.Mock).mockResolvedValue(deletedGenre);
    });

    test("should return deleted genre", async () => {
      const result = await controller.delete("genre-1");
      expect(genreServiceMock.delete).toHaveBeenCalledWith("genre-1");
      expect(result).toEqual(deletedGenre);
    });
  });
});
