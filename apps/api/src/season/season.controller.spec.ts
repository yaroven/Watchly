import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FilterRule } from "../common/pagination/filter-rule.enum";
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
    describe("should return the created season", () => {
      it("if given valid data", async () => {
        const createData = {
          titleId: "title-1",
          number: 1,
          name: "Season 1",
          description: "Desc",
        };
        const createdSeason = { id: "season-1", ...createData };
        (seasonServiceMock.create as jest.Mock).mockResolvedValue(createdSeason);

        const result = await controller.create(createData);

        expect(seasonServiceMock.create).toHaveBeenCalledWith(createData);
        expect(result).toEqual(createdSeason);
      });
    });
  });

  describe("findAll", () => {
    describe("should return the list of seasons", () => {
      const seasonsResponse = [{ id: "season-1" }];

      beforeEach(() => {
        (seasonServiceMock.findAll as jest.Mock).mockResolvedValue(seasonsResponse);
      });

      it("if a titleId filter is provided", async () => {
        const filters = [{ property: "titleId", rule: FilterRule.EQ, value: "title-1" }];

        const result = await controller.findAll(filters);

        expect(seasonServiceMock.findAll).toHaveBeenCalledWith(filters, undefined);
        expect(result).toEqual(seasonsResponse);
      });

      it("if no filters are provided", async () => {
        const result = await controller.findAll([]);

        expect(seasonServiceMock.findAll).toHaveBeenCalledWith([], undefined);
        expect(result).toEqual(seasonsResponse);
      });
    });
  });

  describe("findOne", () => {
    describe("should return the season", () => {
      it("if the season exists", async () => {
        const season = { id: "season-1" };
        (seasonServiceMock.findOne as jest.Mock).mockResolvedValue(season);

        const result = await controller.findOne("season-1");

        expect(seasonServiceMock.findOne).toHaveBeenCalledWith("season-1");
        expect(result).toEqual(season);
      });
    });

    describe("should throw NotFoundException", () => {
      it("if the season does not exist", async () => {
        (seasonServiceMock.findOne as jest.Mock).mockResolvedValue(null);

        const action = controller.findOne("non-existent");

        await expect(action).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe("update", () => {
    describe("should return the updated season", () => {
      it("if given valid data", async () => {
        const updateData = {
          number: 1,
          name: "New Season",
          description: "Desc",
          titleId: "title-1",
        };
        const updatedSeason = { id: "season-1", name: "New Season" };
        (seasonServiceMock.update as jest.Mock).mockResolvedValue(updatedSeason);

        const result = await controller.update("season-1", updateData);

        expect(seasonServiceMock.update).toHaveBeenCalledWith("season-1", updateData);
        expect(result).toEqual(updatedSeason);
      });
    });
  });

  describe("getPosterUploadUrl", () => {
    describe("should return poster upload URLs", () => {
      it("always", async () => {
        const urlsResponse = { uploadUrl: "url", posterUrl: "url" };
        (seasonServiceMock.createPosterUploadingUrl as jest.Mock).mockResolvedValue(urlsResponse);

        const result = await controller.getPosterUploadUrl("season-1");

        expect(seasonServiceMock.createPosterUploadingUrl).toHaveBeenCalledWith("season-1");
        expect(result).toEqual(urlsResponse);
      });
    });
  });

  describe("delete", () => {
    describe("should return the deleted season", () => {
      it("always", async () => {
        const deletedSeason = { id: "season-1" };
        (seasonServiceMock.delete as jest.Mock).mockResolvedValue(deletedSeason);

        const result = await controller.delete("season-1");

        expect(seasonServiceMock.delete).toHaveBeenCalledWith("season-1");
        expect(result).toEqual(deletedSeason);
      });
    });
  });
});
