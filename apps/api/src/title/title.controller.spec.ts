import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FilterRule } from "../common/pagination/filter-rule.enum";
import { TitleController } from "./title.controller";
import { TitleService } from "./title.service";

describe("TitleController", () => {
  let controller: TitleController;
  let titleServiceMock: jest.Mocked<TitleService>;

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

  describe("getMovie", () => {
    describe("should return the movie URL", () => {
      it("always", async () => {
        const urlResponse = { url: "movie-url" };
        (titleServiceMock.getMovieUrl as jest.Mock).mockResolvedValue(urlResponse);

        const result = await controller.getMovie("title-1");

        expect(titleServiceMock.getMovieUrl).toHaveBeenCalledWith("title-1");
        expect(result).toEqual(urlResponse);
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

        expect(titleServiceMock.findAll).toHaveBeenCalledWith(query, sort, filters);
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

        expect(titleServiceMock.findOne).toHaveBeenCalledWith("title-1");
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

        const result = await controller.update("title-1", updateData as any);

        expect(titleServiceMock.update).toHaveBeenCalledWith("title-1", updateData);
        expect(result).toEqual(updatedTitle);
      });
    });
  });

  describe("startUpload", () => {
    describe("should start a multipart upload", () => {
      it("always", async () => {
        const startResponse = { uploadId: "upload-1", partSize: 8, parts: [] };
        (titleServiceMock.startMovieUpload as jest.Mock).mockResolvedValue(startResponse);

        const result = await controller.startUpload("title-1", { fileSize: 1000 });

        expect(titleServiceMock.startMovieUpload).toHaveBeenCalledWith("title-1", 1000);
        expect(result).toEqual(startResponse);
      });
    });
  });

  describe("completeUpload", () => {
    describe("should complete a multipart upload", () => {
      it("always", async () => {
        const dto = { uploadId: "upload-1", parts: [{ partNumber: 1, eTag: "etag-1" }] };

        await controller.completeUpload("title-1", dto);

        expect(titleServiceMock.completeMovieUpload).toHaveBeenCalledWith(
          "title-1",
          "upload-1",
          dto.parts,
        );
      });
    });
  });

  describe("abortUpload", () => {
    describe("should abort a multipart upload", () => {
      it("always", async () => {
        await controller.abortUpload("title-1", "upload-1");

        expect(titleServiceMock.abortMovieUpload).toHaveBeenCalledWith("title-1", "upload-1");
      });
    });
  });

  describe("getPosterUploadUrl", () => {
    describe("should return poster upload URLs", () => {
      it("always", async () => {
        const urlsResponse = { uploadUrl: "url", posterUrl: "url" };
        (titleServiceMock.createPosterUploadingUrl as jest.Mock).mockResolvedValue(urlsResponse);

        const result = await controller.getPosterUploadUrl("title-1");

        expect(titleServiceMock.createPosterUploadingUrl).toHaveBeenCalledWith("title-1");
        expect(result).toEqual(urlsResponse);
      });
    });
  });

  describe("transcodeMovie", () => {
    describe("should call transcode method", () => {
      it("always", async () => {
        (titleServiceMock.transcode as jest.Mock).mockResolvedValue(undefined);

        await controller.transcodeMovie("title-1");

        expect(titleServiceMock.transcode).toHaveBeenCalledWith("title-1");
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

  describe("getCast", () => {
    describe("should return the title's cast", () => {
      it("always", async () => {
        const cast = [{ id: "credit-1", character: "Neo", order: 0, artist: { id: "artist-1" } }];
        (titleServiceMock.getCast as jest.Mock).mockResolvedValue(cast);

        const result = await controller.getCast("title-1");

        expect(titleServiceMock.getCast).toHaveBeenCalledWith("title-1");
        expect(result).toEqual(cast);
      });
    });
  });

  describe("setCast", () => {
    describe("should replace the title's cast", () => {
      it("always", async () => {
        const dto = { credits: [{ artistId: "artist-1", character: "Neo" }] };
        const cast = [{ id: "credit-1", character: "Neo", order: 0, artist: { id: "artist-1" } }];
        (titleServiceMock.setCast as jest.Mock).mockResolvedValue(cast);

        const result = await controller.setCast("title-1", dto);

        expect(titleServiceMock.setCast).toHaveBeenCalledWith("title-1", dto.credits);
        expect(result).toEqual(cast);
      });
    });
  });
});
