import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
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
            createMovieUploadingUrl: jest.fn(),
            createPosterUploadingUrl: jest.fn(),
            transcode: jest.fn(),
            delete: jest.fn(),
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
    const createData = { name: "Title", type: "MOVIE" as any, description: "Desc" };
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
    const titlesResponse = { items: [{ id: "title-1" }], totalCount: 1 };

    beforeEach(() => {
      (titleServiceMock.findAll as jest.Mock).mockResolvedValue(titlesResponse);
    });

    test("should return list of titles", async () => {
      const result = await controller.findAll(query);
      expect(titleServiceMock.findAll).toHaveBeenCalledWith(query);
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

  describe("getUploadUrl", () => {
    const urlResponse = { url: "upload-url" };

    beforeEach(() => {
      (titleServiceMock.createMovieUploadingUrl as jest.Mock).mockResolvedValue(urlResponse);
    });

    test("should return upload URL", async () => {
      const result = await controller.getUploadUrl("title-1");
      expect(titleServiceMock.createMovieUploadingUrl).toHaveBeenCalledWith("title-1");
      expect(result).toEqual(urlResponse);
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
});
