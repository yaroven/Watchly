import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TitleType } from "@prisma/client";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { SeasonService } from "../season/season.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";
import { TitleService } from "./title.service";

describe("TitleService", () => {
  let service: TitleService;
  let prismaServiceMock: jest.Mocked<PrismaService>;
  let s3ServiceMock: jest.Mocked<S3Service>;
  let videoTranscoderServiceMock: jest.Mocked<VideoTranscoderService>;
  let seasonServiceMock: jest.Mocked<SeasonService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TitleService,
        {
          provide: PrismaService,
          useValue: {
            title: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: S3Service,
          useValue: {
            getUploadPresignedUrl: jest.fn(),
            getReadPresignedUrl: jest.fn(),
            deleteObject: jest.fn(),
            deleteFolder: jest.fn(),
          },
        },
        PosterService,
        {
          provide: VideoTranscoderService,
          useValue: {
            scheduleTranscodeVideo: jest.fn(),
            cancelScheduledTranscodes: jest.fn(),
          },
        },
        {
          provide: SeasonService,
          useValue: {
            delete: jest.fn(),
            cleanupAssets: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TitleService>(TitleService);
    prismaServiceMock = module.get(PrismaService) as jest.Mocked<PrismaService>;
    s3ServiceMock = module.get(S3Service) as jest.Mocked<S3Service>;
    videoTranscoderServiceMock = module.get(
      VideoTranscoderService,
    ) as jest.Mocked<VideoTranscoderService>;
    seasonServiceMock = module.get(SeasonService) as jest.Mocked<SeasonService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    describe("when valid data is provided", () => {
      const createData = { name: "Title", type: TitleType.MOVIE, description: "Desc" };
      const createdTitle = { id: "title-1", ...createData, posterUrl: "/cat.webp" };

      beforeEach(() => {
        (prismaServiceMock.title.create as jest.Mock).mockResolvedValue(createdTitle);
      });

      test("should return created title with default poster", async () => {
        const result = await service.create(createData);
        expect(prismaServiceMock.title.create).toHaveBeenCalledWith({
          data: { ...createData, posterUrl: "/cat.webp" },
        });
        expect(result).toEqual(createdTitle);
      });
    });
  });

  describe("findAll", () => {
    describe("when fetching without filters", () => {
      const titles = [{ id: "title-1", name: "Title 1" }];

      beforeEach(() => {
        (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue(titles);
        (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(1);
      });

      test("should return paginated titles", async () => {
        const result = await service.findAll({ page: 1, limit: 10 });
        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith({
          where: {},
          skip: 0,
          take: 10,
          orderBy: { createdAt: "desc" },
        });
        expect(result).toEqual({ items: titles, totalCount: 1 });
      });
    });

    describe("when searching by text", () => {
      beforeEach(() => {
        (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([]);
        (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(0);
      });

      test("should filter by search term", async () => {
        await service.findAll({ search: "Test", page: 1, limit: 10 });
        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { name: { contains: "Test", mode: "insensitive" } },
          }),
        );
      });
    });

    describe("when sorting by specific field", () => {
      beforeEach(() => {
        (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([]);
        (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(0);
      });

      test("should sort ascending by name", async () => {
        await service.findAll({ sortBy: "name", sort: "asc", page: 1, limit: 10 });
        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { name: "asc" },
          }),
        );
      });
    });

    describe("when filtering by type", () => {
      beforeEach(() => {
        (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([]);
        (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(0);
      });

      test("should filter by TitleType.MOVIE", async () => {
        await service.findAll({ type: TitleType.MOVIE, page: 1, limit: 10 });
        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ type: TitleType.MOVIE }),
          }),
        );
      });

      test("should filter by TitleType.SERIES", async () => {
        await service.findAll({ type: TitleType.SERIES, page: 1, limit: 10 });
        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ type: TitleType.SERIES }),
          }),
        );
      });
    });

    describe("when filtering by transcodingStatus", () => {
      beforeEach(() => {
        (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([]);
        (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(0);
      });

      test("should filter by transcodingStatus", async () => {
        await service.findAll({ transcodingStatus: "COMPLETED", page: 1, limit: 10 });
        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ transcodingStatus: "COMPLETED" }),
          }),
        );
      });
    });
  });

  describe("findOne", () => {
    describe("when title exists", () => {
      const title = { id: "title-1" };

      beforeEach(() => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
      });

      test("should return title", async () => {
        const result = await service.findOne("title-1");
        expect(prismaServiceMock.title.findUnique).toHaveBeenCalledWith({
          where: { id: "title-1" },
        });
        expect(result).toEqual(title);
      });
    });

    describe("when title does not exist", () => {
      beforeEach(() => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should return null", async () => {
        const result = await service.findOne("non-existent");
        expect(result).toBeNull();
      });
    });
  });

  describe("update", () => {
    describe("when title does not exist", () => {
      beforeEach(() => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.update("non-existent", { name: "New Name" } as any);
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when updating with default poster url", () => {
      const title = { id: "title-1", name: "Old Name" };
      const updateData = { name: "New Name", posterUrl: "/cat.webp" };
      const updatedTitle = { ...title, ...updateData };

      beforeEach(() => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
        (prismaServiceMock.title.update as jest.Mock).mockResolvedValue(updatedTitle);
      });

      test("should update title successfully without presigned url check", async () => {
        const result = await service.update("title-1", updateData as any);
        expect(s3ServiceMock.getReadPresignedUrl).not.toHaveBeenCalled();
        expect(prismaServiceMock.title.update).toHaveBeenCalledWith({
          where: { id: "title-1" },
          data: updateData,
        });
        expect(result).toEqual(updatedTitle);
      });
    });

    describe("when updating with external poster url", () => {
      const title = { id: "title-1" };
      const updateData = { posterUrl: "https://external.com/poster.jpg" };

      beforeEach(() => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
        (s3ServiceMock.getReadPresignedUrl as jest.Mock).mockResolvedValue(
          "https://s3.amazonaws.com/poster",
        );
      });

      test("should throw BadRequestException", async () => {
        const action = service.update("title-1", updateData as any);
        await expect(action).rejects.toThrow(BadRequestException);
        await expect(action).rejects.toThrow("Poster URL must be generated by the backend");
      });
    });

    describe("when updating with managed poster url", () => {
      const title = { id: "title-1" };
      const updateData = { posterUrl: "https://s3.amazonaws.com/poster" };

      beforeEach(() => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
        (s3ServiceMock.getReadPresignedUrl as jest.Mock).mockResolvedValue(
          "https://s3.amazonaws.com/poster",
        );
        (prismaServiceMock.title.update as jest.Mock).mockResolvedValue({
          ...title,
          ...updateData,
        });
      });

      test("should update title successfully", async () => {
        await service.update("title-1", updateData as any);
        expect(prismaServiceMock.title.update).toHaveBeenCalled();
      });
    });
  });

  describe("createMovieUploadingUrl", () => {
    describe("when title exists", () => {
      const urlResponse = "https://s3.com/upload";

      beforeEach(() => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({ id: "title-1" });
        (s3ServiceMock.getUploadPresignedUrl as jest.Mock).mockResolvedValue(urlResponse);
      });

      test("should return upload url", async () => {
        const result = await service.createMovieUploadingUrl("title-1");
        expect(s3ServiceMock.getUploadPresignedUrl).toHaveBeenCalledWith(
          "title-1",
          expect.any(String),
          120,
        );
        expect(result).toEqual({ url: urlResponse });
      });
    });

    describe("when title does not exist", () => {
      beforeEach(() => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.createMovieUploadingUrl("non-existent");
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe("createPosterUploadingUrl", () => {
    describe("when title exists", () => {
      const uploadUrl = "upload-url";
      const posterUrl = "poster-url";

      beforeEach(() => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({ id: "title-1" });
        (s3ServiceMock.getUploadPresignedUrl as jest.Mock).mockResolvedValue(uploadUrl);
        (s3ServiceMock.getReadPresignedUrl as jest.Mock).mockResolvedValue(posterUrl);
      });

      test("should return upload and poster urls", async () => {
        const result = await service.createPosterUploadingUrl("title-1");
        expect(s3ServiceMock.getUploadPresignedUrl).toHaveBeenCalledWith(
          "posters/titles/title-1",
          expect.any(String),
          120,
        );
        expect(s3ServiceMock.getReadPresignedUrl).toHaveBeenCalledWith(
          "posters/titles/title-1",
          expect.any(String),
        );
        expect(result).toEqual({ uploadUrl, posterUrl });
      });
    });
  });

  describe("transcode", () => {
    describe("when title exists", () => {
      beforeEach(() => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({ id: "title-1" });
      });

      test("should schedule transcoding", async () => {
        await service.transcode("title-1");
        expect(videoTranscoderServiceMock.scheduleTranscodeVideo).toHaveBeenCalledWith({
          id: "title-1",
          type: VideoType.MOVIE,
        });
      });
    });

    describe("when title does not exist", () => {
      beforeEach(() => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.transcode("non-existent");
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe("getMovieUrl", () => {
    describe("always", () => {
      const url = "movie-url";

      beforeEach(() => {
        (s3ServiceMock.getReadPresignedUrl as jest.Mock).mockResolvedValue(url);
      });

      test("should return movie presigned url", async () => {
        const result = await service.getMovieUrl("title-1");
        expect(s3ServiceMock.getReadPresignedUrl).toHaveBeenCalledWith(
          "videos/title-1/master.m3u8",
          expect.any(String),
        );
        expect(result).toEqual({ url });
      });
    });
  });

  describe("delete", () => {
    describe("when title exists as MOVIE", () => {
      const title = { id: "title-1", type: TitleType.MOVIE, seasons: [] };

      beforeEach(() => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
        (prismaServiceMock.title.delete as jest.Mock).mockResolvedValue(title);
      });

      test("should delete title and cleanup resources", async () => {
        const result = await service.delete("title-1");
        expect(videoTranscoderServiceMock.cancelScheduledTranscodes).toHaveBeenCalledWith(
          "title-1",
          VideoType.MOVIE,
        );
        expect(s3ServiceMock.deleteObject).toHaveBeenCalledWith(
          "posters/titles/title-1",
          BucketType.PROCESSED,
        );
        expect(s3ServiceMock.deleteFolder).toHaveBeenCalledWith(
          "videos/title-1/",
          BucketType.PROCESSED,
        );
        expect(prismaServiceMock.title.delete).toHaveBeenCalledWith({ where: { id: "title-1" } });
        expect(result).toEqual(title);
      });
    });

    describe("when title exists as SERIES", () => {
      const title = {
        id: "title-1",
        type: TitleType.SERIES,
        seasons: [{ id: "season-1" }, { id: "season-2" }],
      };

      beforeEach(() => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
        (prismaServiceMock.title.delete as jest.Mock).mockResolvedValue(title);
      });

      test("should clean up assets for each season after the title row is deleted", async () => {
        await service.delete("title-1");
        expect(prismaServiceMock.title.delete).toHaveBeenCalledWith({ where: { id: "title-1" } });
        expect(seasonServiceMock.cleanupAssets).toHaveBeenCalledWith(title.seasons[0]);
        expect(seasonServiceMock.cleanupAssets).toHaveBeenCalledWith(title.seasons[1]);
      });

      test("should cancel scheduled transcode jobs", async () => {
        await service.delete("title-1");
        expect(videoTranscoderServiceMock.cancelScheduledTranscodes).toHaveBeenCalledWith(
          "title-1",
          VideoType.MOVIE,
        );
      });

      test("should cleanup S3 resources (poster and video folder)", async () => {
        await service.delete("title-1");
        expect(s3ServiceMock.deleteObject).toHaveBeenCalledWith(
          "posters/titles/title-1",
          BucketType.PROCESSED,
        );
        expect(s3ServiceMock.deleteFolder).toHaveBeenCalledWith(
          "videos/title-1/",
          BucketType.PROCESSED,
        );
      });
    });

    describe("when title does not exist", () => {
      beforeEach(() => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.delete("non-existent");
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });
});
