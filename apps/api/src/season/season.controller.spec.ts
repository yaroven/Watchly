import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { SeasonController } from "./season.controller";
import { SeasonService } from "./season.service";

describe("SeasonController", () => {
  let controller: SeasonController;
  let seasonServiceMock: jest.Mocked<SeasonService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeasonController],
      providers: [
        {
          provide: SeasonService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            createPosterUploadingUrl: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SeasonController>(SeasonController);
    seasonServiceMock = module.get(SeasonService) as jest.Mocked<SeasonService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createData = { titleId: "title-1", number: 1, name: "Season 1", description: "Desc" };
    const createdSeason = { id: "season-1", ...createData };

    beforeEach(() => {
      (seasonServiceMock.create as jest.Mock).mockResolvedValue(createdSeason);
    });

    test("should return created season", async () => {
      const result = await controller.create(createData);
      expect(seasonServiceMock.create).toHaveBeenCalledWith(createData);
      expect(result).toEqual(createdSeason);
    });
  });

  describe("findAll", () => {
    const seasonsResponse = [{ id: "season-1" }];

    beforeEach(() => {
      (seasonServiceMock.findAll as jest.Mock).mockResolvedValue(seasonsResponse);
    });

    test("should return list of seasons for titleId", async () => {
      const result = await controller.findAll("title-1");
      expect(seasonServiceMock.findAll).toHaveBeenCalledWith("title-1");
      expect(result).toEqual(seasonsResponse);
    });

    test("should return list of seasons without titleId", async () => {
      const result = await controller.findAll();
      expect(seasonServiceMock.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(seasonsResponse);
    });
  });

  describe("findOne", () => {
    describe("when season exists", () => {
      const season = { id: "season-1" };

      beforeEach(() => {
        (seasonServiceMock.findOne as jest.Mock).mockResolvedValue(season);
      });

      test("should return the season", async () => {
        const result = await controller.findOne("season-1");
        expect(seasonServiceMock.findOne).toHaveBeenCalledWith("season-1");
        expect(result).toEqual(season);
      });
    });

    describe("when season does not exist", () => {
      beforeEach(() => {
        (seasonServiceMock.findOne as jest.Mock).mockResolvedValue(null);
      });

      test("should throw NotFoundException", async () => {
        const action = controller.findOne("non-existent");
        await expect(action).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe("update", () => {
    const updateData = { name: "New Season" };
    const updatedSeason = { id: "season-1", name: "New Season" };

    beforeEach(() => {
      (seasonServiceMock.update as jest.Mock).mockResolvedValue(updatedSeason);
    });

    test("should return updated season", async () => {
      const result = await controller.update("season-1", updateData);
      expect(seasonServiceMock.update).toHaveBeenCalledWith("season-1", updateData);
      expect(result).toEqual(updatedSeason);
    });
  });

  describe("getPosterUploadUrl", () => {
    const urlsResponse = { uploadUrl: "url", posterUrl: "url" };

    beforeEach(() => {
      (seasonServiceMock.createPosterUploadingUrl as jest.Mock).mockResolvedValue(urlsResponse);
    });

    test("should return poster upload URLs", async () => {
      const result = await controller.getPosterUploadUrl("season-1");
      expect(seasonServiceMock.createPosterUploadingUrl).toHaveBeenCalledWith("season-1");
      expect(result).toEqual(urlsResponse);
    });
  });

  describe("delete", () => {
    const deletedSeason = { id: "season-1" };

    beforeEach(() => {
      (seasonServiceMock.delete as jest.Mock).mockResolvedValue(deletedSeason);
    });

    test("should return deleted season", async () => {
      const result = await controller.delete("season-1");
      expect(seasonServiceMock.delete).toHaveBeenCalledWith("season-1");
      expect(result).toEqual(deletedSeason);
    });
  });
});
