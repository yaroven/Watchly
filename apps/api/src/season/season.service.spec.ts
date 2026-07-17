import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";
import { SeasonService } from "./season.service";

describe("SeasonService", () => {
  let service: SeasonService;
  let prismaMock: jest.Mocked<PrismaService>;
  let s3ServiceMock: jest.Mocked<S3Service>;
  let videoTranscoderServiceMock: jest.Mocked<VideoTranscoderService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeasonService,
        {
          provide: PrismaService,
          useValue: {
            season: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: S3Service,
          useValue: {
            getReadPresignedUrl: jest.fn(),
            getUploadPresignedUrl: jest.fn(),
            deleteObject: jest.fn(),
            deleteFolder: jest.fn(),
          },
        },
        {
          provide: VideoTranscoderService,
          useValue: {
            cancelScheduledTranscodes: jest.fn(),
          },
        },
        PosterService,
      ],
    }).compile();

    service = module.get<SeasonService>(SeasonService);
    prismaMock = module.get(PrismaService) as jest.Mocked<PrismaService>;
    s3ServiceMock = module.get(S3Service) as jest.Mocked<S3Service>;
    videoTranscoderServiceMock = module.get(
      VideoTranscoderService,
    ) as jest.Mocked<VideoTranscoderService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    describe("when valid data is provided", () => {
      const createData = { titleId: "title-1", number: 1, name: "Season 1", description: "Desc" };
      const createdSeason = { id: "season-1", ...createData };

      beforeEach(() => {
        (prismaMock.season.create as jest.Mock).mockResolvedValue(createdSeason);
      });

      test("should create and return the season", async () => {
        const result = await service.create(createData as any);
        expect(prismaMock.season.create).toHaveBeenCalledWith({ data: createData });
        expect(result).toEqual(createdSeason);
      });
    });
  });

  describe("findAll", () => {
    describe("when titleId is provided", () => {
      const seasons = [{ id: "season-1" }, { id: "season-2" }];

      beforeEach(() => {
        (prismaMock.season.findMany as jest.Mock).mockResolvedValue(seasons);
      });

      test("should return seasons for the specific title", async () => {
        const result = await service.findAll("title-1");
        expect(prismaMock.season.findMany).toHaveBeenCalledWith({
          where: { titleId: "title-1" },
          orderBy: { number: "asc" },
        });
        expect(result).toEqual(seasons);
      });
    });

    describe("when titleId is not provided", () => {
      const seasons = [{ id: "season-1" }, { id: "season-2" }];

      beforeEach(() => {
        (prismaMock.season.findMany as jest.Mock).mockResolvedValue(seasons);
      });

      test("should return all seasons", async () => {
        const result = await service.findAll();
        expect(prismaMock.season.findMany).toHaveBeenCalledWith({
          where: {},
          orderBy: { number: "asc" },
        });
        expect(result).toEqual(seasons);
      });
    });
  });

  describe("findOne", () => {
    describe("when season exists", () => {
      const season = { id: "season-1" };

      beforeEach(() => {
        (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(season);
      });

      test("should return the season", async () => {
        const result = await service.findOne("season-1");
        expect(prismaMock.season.findUnique).toHaveBeenCalledWith({
          where: { id: "season-1" },
        });
        expect(result).toEqual(season);
      });
    });

    describe("when season does not exist", () => {
      beforeEach(() => {
        (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should return null", async () => {
        const result = await service.findOne("non-existent");
        expect(prismaMock.season.findUnique).toHaveBeenCalledWith({
          where: { id: "non-existent" },
        });
        expect(result).toBeNull();
      });
    });
  });

  describe("update", () => {
    describe("when season does not exist", () => {
      beforeEach(() => {
        (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.update("non-existent", { name: "New Title" });
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when season exists and posterUrl is provided", () => {
      const season = { id: "season-1" };
      const backendPoster =
        "https://s3.example.com/posters/seasons/season-1?X-Amz-Date=1&X-Amz-Signature=aaa";

      describe("when posterUrl matches the backend url's path", () => {
        const submittedPoster =
          "https://s3.example.com/posters/seasons/season-1?X-Amz-Date=2&X-Amz-Signature=bbb";

        beforeEach(() => {
          (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(season);
          s3ServiceMock.getReadPresignedUrl.mockResolvedValue(backendPoster);
          (prismaMock.season.update as jest.Mock).mockResolvedValue({
            ...season,
            name: "New Title",
          });
        });

        test("should assert poster URL and update the season", async () => {
          const result = await service.update("season-1", {
            name: "New Title",
            posterUrl: submittedPoster,
          });
          expect(s3ServiceMock.getReadPresignedUrl).toHaveBeenCalledWith(
            "posters/seasons/season-1",
            BucketType.PROCESSED,
          );
          expect(prismaMock.season.update).toHaveBeenCalledWith({
            where: { id: "season-1" },
            data: { name: "New Title", posterUrl: submittedPoster },
          });
          expect(result).toEqual({ ...season, name: "New Title" });
        });
      });

      describe("when posterUrl does not match the backend url's path", () => {
        beforeEach(() => {
          (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(season);
          s3ServiceMock.getReadPresignedUrl.mockResolvedValue(backendPoster);
        });

        test("should throw BadRequestException", async () => {
          const action = service.update("season-1", {
            name: "New Title",
            posterUrl: "https://s3.example.com/some/other/path",
          });
          await expect(action).rejects.toThrow(BadRequestException);
          expect(prismaMock.season.update).not.toHaveBeenCalled();
        });
      });
    });

    describe("when season exists and posterUrl is not provided", () => {
      const season = { id: "season-1" };

      beforeEach(() => {
        (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(season);
        (prismaMock.season.update as jest.Mock).mockResolvedValue({
          ...season,
          name: "New Title",
        });
      });

      test("should update the season without checking poster URL", async () => {
        const result = await service.update("season-1", { name: "New Title" });
        expect(s3ServiceMock.getReadPresignedUrl).not.toHaveBeenCalled();
        expect(prismaMock.season.update).toHaveBeenCalledWith({
          where: { id: "season-1" },
          data: { name: "New Title" },
        });
        expect(result).toEqual({ ...season, name: "New Title" });
      });
    });
  });

  describe("createPosterUploadingUrl", () => {
    describe("when season does not exist", () => {
      beforeEach(() => {
        (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.createPosterUploadingUrl("non-existent");
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when season exists", () => {
      const season = { id: "season-1" };
      const uploadUrl = "upload-url";
      const posterUrl = "poster-url";

      beforeEach(() => {
        (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(season);
        s3ServiceMock.getUploadPresignedUrl.mockResolvedValue(uploadUrl);
        s3ServiceMock.getReadPresignedUrl.mockResolvedValue(posterUrl);
      });

      test("should return upload and poster URLs", async () => {
        const result = await service.createPosterUploadingUrl("season-1");
        const key = "posters/seasons/season-1";
        expect(s3ServiceMock.getUploadPresignedUrl).toHaveBeenCalledWith(
          key,
          BucketType.PROCESSED,
          120,
        );
        expect(s3ServiceMock.getReadPresignedUrl).toHaveBeenCalledWith(key, BucketType.PROCESSED);
        expect(result).toEqual({ uploadUrl, posterUrl });
      });
    });
  });

  describe("delete", () => {
    describe("when season does not exist", () => {
      beforeEach(() => {
        (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.delete("non-existent");
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when season exists", () => {
      const season = {
        id: "season-1",
        titleId: "title-1",
        episodes: [{ id: "episode-1" }, { id: "episode-2" }],
      };

      beforeEach(() => {
        (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(season);
        s3ServiceMock.deleteObject.mockResolvedValue(undefined as any);
        s3ServiceMock.deleteFolder.mockResolvedValue(undefined as any);
        videoTranscoderServiceMock.cancelScheduledTranscodes.mockResolvedValue(undefined as any);
        (prismaMock.season.delete as jest.Mock).mockResolvedValue(season);
      });

      test("should delete season, its episodes from S3, and its poster/folder from S3", async () => {
        const result = await service.delete("season-1");

        expect(prismaMock.season.findUnique).toHaveBeenCalledWith({
          where: { id: "season-1" },
          include: { episodes: true },
        });

        expect(videoTranscoderServiceMock.cancelScheduledTranscodes).toHaveBeenCalledWith(
          "episode-1",
          VideoType.EPISODE,
        );
        expect(videoTranscoderServiceMock.cancelScheduledTranscodes).toHaveBeenCalledWith(
          "episode-2",
          VideoType.EPISODE,
        );

        expect(s3ServiceMock.deleteObject).toHaveBeenCalledWith("episode-1", BucketType.RAW);
        expect(s3ServiceMock.deleteObject).toHaveBeenCalledWith("episode-2", BucketType.RAW);

        expect(s3ServiceMock.deleteObject).toHaveBeenCalledWith(
          "posters/seasons/season-1",
          BucketType.PROCESSED,
        );
        expect(s3ServiceMock.deleteFolder).toHaveBeenCalledWith(
          "videos/title-1/season-1/",
          BucketType.PROCESSED,
        );

        expect(prismaMock.season.delete).toHaveBeenCalledWith({
          where: { id: "season-1" },
        });
        expect(result).toEqual(season);
      });
    });
  });
});
