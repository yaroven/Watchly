import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FilterRule } from "../common/pagination/filter-rule.enum";
import { PrismaService } from "../prisma/prisma.service";
import { TitleController } from "./title.controller";
import { TitleService } from "./title.service";
import { TitleExistsPipe } from "./utils/title-exists.pipe";

describe("TitleController", () => {
  let controller: TitleController;
  let titleServiceMock: jest.Mocked<TitleService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TitleController],
      providers: [
        TitleExistsPipe,
        {
          provide: PrismaService,
          useValue: { title: { findUnique: jest.fn().mockResolvedValue({ id: "title-1" }) } },
        },
        {
          provide: TitleService,
          useValue: {
            create: jest.fn(),
            getMovieUrl: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            startMovieUpload: jest.fn(),
            completeMovieUpload: jest.fn(),
            abortMovieUpload: jest.fn(),
            createPosterUploadingUrl: jest.fn(),
            transcode: jest.fn(),
            delete: jest.fn(),
            getCast: jest.fn(),
            setCast: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TitleController>(TitleController);
    titleServiceMock = module.get(TitleService) as jest.Mocked<TitleService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    describe("should return the created title", () => {
      it("if given valid data", async () => {
        const createData = {
          name: "Title",
          type: "MOVIE" as any,
          description: "Desc",
          ageRating: "AGE_0" as any,
          country: "US",
          releaseDate: "2026-01-01",
          language: "en",
          trailerUrl: "https://example.com/trailer.mp4",
          runtime: 120,
          network: "Netflix",
          director: "Jane Doe",
          closedCaption: true,
        };
        const createdTitle = { id: "title-1", ...createData };
        (titleServiceMock.create as jest.Mock).mockResolvedValue(createdTitle);

        const result = await controller.create(createData);

        expect(titleServiceMock.create).toHaveBeenCalledWith(createData);
        expect(result).toEqual(createdTitle);
      });
    });
  });

  describe("findAll", () => {
    describe("should return the list of titles", () => {
      it("if given query, sort, and filters", async () => {
        const query = { page: 1, limit: 10 };
        const sort = { property: "name", direction: "asc" as const };
        const filters = [{ property: "type", rule: FilterRule.EQ, value: "MOVIE" }];
        const titlesResponse = { items: [{ id: "title-1" }], totalCount: 1 };
        (titleServiceMock.findAll as jest.Mock).mockResolvedValue(titlesResponse);

        const result = await controller.findAll(query, sort, filters);

        expect(titleServiceMock.findAll).toHaveBeenCalledWith(query, sort, filters, undefined);
        expect(result).toEqual(titlesResponse);
      });
    });
  });

  describe("findOne", () => {
    describe("should return the title", () => {
      it("if the title exists", async () => {
        const title = { id: "title-1" };
        (titleServiceMock.findOne as jest.Mock).mockResolvedValue(title);

        const result = await controller.findOne("title-1");

        expect(titleServiceMock.findOne).toHaveBeenCalledWith("title-1", undefined);
        expect(result).toEqual(title);
      });
    });

    describe("should throw NotFoundException", () => {
      it("if the title does not exist", async () => {
        (titleServiceMock.findOne as jest.Mock).mockResolvedValue(null);

        const action = controller.findOne("non-existent");

        await expect(action).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe("update", () => {
    describe("should return the updated title", () => {
      it("if given valid data", async () => {
        const updateData = { name: "New Title" };
        const updatedTitle = { id: "title-1", name: "New Title" };
        (titleServiceMock.update as jest.Mock).mockResolvedValue(updatedTitle);

        const result = await controller.update("title-1", updateData as any, "admin-1");

        expect(titleServiceMock.update).toHaveBeenCalledWith("title-1", updateData, "admin-1");
        expect(result).toEqual(updatedTitle);
      });
    });
  });

  describe("delete", () => {
    describe("should return the deleted title", () => {
      it("always", async () => {
        const deletedTitle = { id: "title-1" };
        (titleServiceMock.delete as jest.Mock).mockResolvedValue(deletedTitle);

        const result = await controller.delete("title-1");

        expect(titleServiceMock.delete).toHaveBeenCalledWith("title-1");
        expect(result).toEqual(deletedTitle);
      });
    });
  });
});
