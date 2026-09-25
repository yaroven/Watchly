import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { CastCreditService } from "../cast-credit/cast-credit.service";
import { FilterRule } from "../common/pagination/filter-rule.enum";
import { TitleController } from "./title.controller";
import { TitleService } from "./title.service";

describe("TitleController", () => {
  let controller: TitleController;
  let titleServiceMock: jest.Mocked<TitleService>;
  let castCreditServiceMock: jest.Mocked<CastCreditService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TitleController],
      providers: [
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
          },
        },
        {
          provide: CastCreditService,
          useValue: {
            getCast: jest.fn(),
            setCast: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TitleController>(TitleController);
    titleServiceMock = module.get(TitleService) as jest.Mocked<TitleService>;
    castCreditServiceMock = module.get(CastCreditService) as jest.Mocked<CastCreditService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
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

    beforeEach(() => {
      (titleServiceMock.create as jest.Mock).mockResolvedValue(createdTitle);
    });

    test("should return created title", async () => {
      const result = await controller.create(createData);
      expect(titleServiceMock.create).toHaveBeenCalledWith(createData);
      expect(result).toEqual(createdTitle);
    });
  });

  describe("getMovie", () => {
    const urlResponse = { url: "movie-url" };

    beforeEach(() => {
      (titleServiceMock.getMovieUrl as jest.Mock).mockResolvedValue(urlResponse);
    });

    test("should return movie URL", async () => {
      const result = await controller.getMovie("title-1");
      expect(titleServiceMock.getMovieUrl).toHaveBeenCalledWith("title-1");
      expect(result).toEqual(urlResponse);
    });
  });

  describe("findAll", () => {
    const query = { page: 1, limit: 10 };
    const sort = { property: "name", direction: "asc" as const };
    const filters = [{ property: "type", rule: FilterRule.EQ, value: "MOVIE" }];
    const titlesResponse = { items: [{ id: "title-1" }], totalCount: 1 };

    beforeEach(() => {
      (titleServiceMock.findAll as jest.Mock).mockResolvedValue(titlesResponse);
    });

    test("should return list of titles", async () => {
      const result = await controller.findAll(query, sort, filters);
      expect(titleServiceMock.findAll).toHaveBeenCalledWith(query, sort, filters);
      expect(result).toEqual(titlesResponse);
    });
  });

  describe("findOne", () => {
    describe("when title exists", () => {
      const title = { id: "title-1" };

      beforeEach(() => {
        (titleServiceMock.findOne as jest.Mock).mockResolvedValue(title);
      });

      test("should return the title", async () => {
        const result = await controller.findOne("title-1");
        expect(titleServiceMock.findOne).toHaveBeenCalledWith("title-1");
        expect(result).toEqual(title);
      });
    });

    describe("when title does not exist", () => {
      beforeEach(() => {
        (titleServiceMock.findOne as jest.Mock).mockResolvedValue(null);
      });

      test("should throw NotFoundException", async () => {
        const action = controller.findOne("non-existent");
        await expect(action).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe("update", () => {
    const updateData = { name: "New Title" };
    const updatedTitle = { id: "title-1", name: "New Title" };

    beforeEach(() => {
      (titleServiceMock.update as jest.Mock).mockResolvedValue(updatedTitle);
    });

    test("should return updated title", async () => {
      const result = await controller.update("title-1", updateData as any);
      expect(titleServiceMock.update).toHaveBeenCalledWith("title-1", updateData);
      expect(result).toEqual(updatedTitle);
    });
  });

  describe("startUpload", () => {
    const startResponse = { uploadId: "upload-1", partSize: 8, parts: [] };

    beforeEach(() => {
      (titleServiceMock.startMovieUpload as jest.Mock).mockResolvedValue(startResponse);
    });

    test("should start a multipart upload", async () => {
      const result = await controller.startUpload("title-1", { fileSize: 1000 });
      expect(titleServiceMock.startMovieUpload).toHaveBeenCalledWith("title-1", 1000);
      expect(result).toEqual(startResponse);
    });
  });

  describe("completeUpload", () => {
    test("should complete a multipart upload", async () => {
      const dto = { uploadId: "upload-1", parts: [{ partNumber: 1, eTag: "etag-1" }] };
      await controller.completeUpload("title-1", dto);
      expect(titleServiceMock.completeMovieUpload).toHaveBeenCalledWith(
        "title-1",
        "upload-1",
        dto.parts,
      );
    });
  });

  describe("abortUpload", () => {
    test("should abort a multipart upload", async () => {
      await controller.abortUpload("title-1", "upload-1");
      expect(titleServiceMock.abortMovieUpload).toHaveBeenCalledWith("title-1", "upload-1");
    });
  });

  describe("getPosterUploadUrl", () => {
    const urlsResponse = { uploadUrl: "url", posterUrl: "url" };

    beforeEach(() => {
      (titleServiceMock.createPosterUploadingUrl as jest.Mock).mockResolvedValue(urlsResponse);
    });

    test("should return poster upload URLs", async () => {
      const result = await controller.getPosterUploadUrl("title-1");
      expect(titleServiceMock.createPosterUploadingUrl).toHaveBeenCalledWith("title-1");
      expect(result).toEqual(urlsResponse);
    });
  });

  describe("transcodeMovie", () => {
    beforeEach(() => {
      (titleServiceMock.transcode as jest.Mock).mockResolvedValue(undefined);
    });

    test("should call transcode method", async () => {
      await controller.transcodeMovie("title-1");
      expect(titleServiceMock.transcode).toHaveBeenCalledWith("title-1");
    });
  });

  describe("delete", () => {
    const deletedTitle = { id: "title-1" };

    beforeEach(() => {
      (titleServiceMock.delete as jest.Mock).mockResolvedValue(deletedTitle);
    });

    test("should return deleted title", async () => {
      const result = await controller.delete("title-1");
      expect(titleServiceMock.delete).toHaveBeenCalledWith("title-1");
      expect(result).toEqual(deletedTitle);
    });
  });

  describe("getCast", () => {
    const cast = [{ id: "credit-1", character: "Neo", order: 0, artist: { id: "artist-1" } }];

    beforeEach(() => {
      (castCreditServiceMock.getCast as jest.Mock).mockResolvedValue(cast);
    });

    test("should return the title's cast", async () => {
      const result = await controller.getCast("title-1");
      expect(castCreditServiceMock.getCast).toHaveBeenCalledWith("title-1");
      expect(result).toEqual(cast);
    });
  });

  describe("setCast", () => {
    const dto = { credits: [{ artistId: "artist-1", character: "Neo" }] };
    const cast = [{ id: "credit-1", character: "Neo", order: 0, artist: { id: "artist-1" } }];

    beforeEach(() => {
      (castCreditServiceMock.setCast as jest.Mock).mockResolvedValue(cast);
    });

    test("should replace the title's cast", async () => {
      const result = await controller.setCast("title-1", dto);
      expect(castCreditServiceMock.setCast).toHaveBeenCalledWith("title-1", dto.credits);
      expect(result).toEqual(cast);
    });
  });
});
