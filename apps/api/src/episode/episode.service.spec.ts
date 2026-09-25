import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { FilterRule } from "../common/pagination/filter-rule.enum";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";
import { EpisodeService } from "./episode.service";

describe("EpisodeService", () => {
  let service: EpisodeService;
  let prismaMock: jest.Mocked<PrismaService>;
  let s3ServiceMock: jest.Mocked<S3Service>;
  let videoTranscoderServiceMock: jest.Mocked<VideoTranscoderService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EpisodeService,
        {
          provide: PrismaService,
          useValue: {
            episode: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
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
            startMultipartUpload: jest.fn(),
            completeMultipartUpload: jest.fn(),
            abortMultipartUpload: jest.fn(),
            deleteObject: jest.fn(),
            deleteFolder: jest.fn(),
          },
        },
        {
          provide: VideoTranscoderService,
          useValue: {
            scheduleTranscodeVideo: jest.fn(),
            cancelScheduledTranscodes: jest.fn(),
            cleanupVideoAsset: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EpisodeService>(EpisodeService);
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
    const createData = { seasonId: "season-1", number: 1, name: "Episode 1", description: "Desc" };

    describe("when episode does not exist", () => {
      const createdEpisode = { id: "episode-1", ...createData };

      beforeEach(() => {
        (prismaMock.episode.create as jest.Mock).mockResolvedValue(createdEpisode);
      });

      test("should create and return the episode", async () => {
        const result = await service.create(createData as any);
        expect(prismaMock.episode.create).toHaveBeenCalledWith({ data: createData });
        expect(result).toEqual(createdEpisode);
      });
    });

    describe("when episode with same number already exists in season", () => {
      beforeEach(() => {
        (prismaMock.episode.create as jest.Mock).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "test",
          }),
        );
      });

      test("should throw BadRequestException instead of the raw Prisma error", async () => {
        const action = service.create(createData as any);
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe("findAll", () => {
    const episodes = [{ id: "episode-1" }, { id: "episode-2" }];

    describe("when a seasonId filter is provided", () => {
      beforeEach(() => {
        (prismaMock.episode.findMany as jest.Mock).mockResolvedValue(episodes);
      });

      test("should return episodes for the season", async () => {
        const result = await service.findAll([
          { property: "seasonId", rule: FilterRule.EQ, value: "season-1" },
        ]);
        expect(prismaMock.episode.findMany).toHaveBeenCalledWith({
          where: { seasonId: "season-1" },
          orderBy: { number: "asc" },
        });
        expect(result).toEqual(episodes);
      });
    });

    describe("when no filters are provided", () => {
      beforeEach(() => {
        (prismaMock.episode.findMany as jest.Mock).mockResolvedValue(episodes);
      });

      test("should return all episodes", async () => {
        const result = await service.findAll();
        expect(prismaMock.episode.findMany).toHaveBeenCalledWith({
          where: {},
          orderBy: { number: "asc" },
        });
        expect(result).toEqual(episodes);
      });
    });
  });

  describe("findOneDetailed", () => {
    describe("when episode is found", () => {
      const episode = { id: "episode-1" };
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
      });

      test("should return detailed episode", async () => {
        const result = await service.findOneDetailed("episode-1");
        expect(prismaMock.episode.findUnique).toHaveBeenCalledWith({
          where: { id: "episode-1" },
          include: { season: { include: { title: true } } },
        });
        expect(result).toEqual(episode);
      });
    });
  });

  describe("findOne", () => {
    describe("when episode exists", () => {
      const episode = { id: "episode-1" };
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
      });

      test("should return the episode", async () => {
        const result = await service.findOne("episode-1");
        expect(prismaMock.episode.findUnique).toHaveBeenCalledWith({ where: { id: "episode-1" } });
        expect(result).toEqual(episode);
      });
    });

    describe("when episode does not exist", () => {
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should return null", async () => {
        const result = await service.findOne("non-existent");
        expect(prismaMock.episode.findUnique).toHaveBeenCalledWith({
          where: { id: "non-existent" },
        });
        expect(result).toBeNull();
      });
    });
  });

  describe("update", () => {
    const updateData = { number: 2, name: "New Name", description: "New Desc" };

    describe("when episode does not exist", () => {
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.update("non-existent", updateData);
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when episode exists but the number is already taken by another episode", () => {
      const episode = { id: "episode-1", seasonId: "season-1" };
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
        (prismaMock.episode.findFirst as jest.Mock).mockResolvedValue({ id: "existing-id" });
      });

      test("should throw BadRequestException", async () => {
        const action = service.update("episode-1", updateData);
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when episode exists and the number is available", () => {
      const episode = { id: "episode-1", seasonId: "season-1" };
      const updatedEpisode = { ...episode, ...updateData };
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
        (prismaMock.episode.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.episode.update as jest.Mock).mockResolvedValue(updatedEpisode);
      });

      test("should update and return the episode", async () => {
        const result = await service.update("episode-1", updateData);
        expect(prismaMock.episode.findFirst).toHaveBeenCalledWith({
          where: {
            seasonId: "season-1",
            number: updateData.number,
            id: { not: "episode-1" },
          },
        });
        expect(prismaMock.episode.update).toHaveBeenCalledWith({
          where: { id: "episode-1" },
          data: updateData,
        });
        expect(result).toEqual(updatedEpisode);
      });
    });

    describe("when a concurrent request wins the race after the pre-check", () => {
      const episode = { id: "episode-1", seasonId: "season-1" };
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
        (prismaMock.episode.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.episode.update as jest.Mock).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "test",
          }),
        );
      });

      test("should throw BadRequestException instead of the raw Prisma error", async () => {
        const action = service.update("episode-1", updateData);
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe("delete", () => {
    describe("when episode does not exist", () => {
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.delete("non-existent");
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when episode exists", () => {
      const episode = {
        id: "episode-1",
        seasonId: "season-1",
        season: { titleId: "title-1" },
      };

      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
        videoTranscoderServiceMock.cleanupVideoAsset.mockResolvedValue(undefined as any);
        (prismaMock.episode.delete as jest.Mock).mockResolvedValue(episode);
      });

      test("should delete episode and related media", async () => {
        const result = await service.delete("episode-1");

        expect(videoTranscoderServiceMock.cleanupVideoAsset).toHaveBeenCalledWith(
          "episode-1",
          VideoType.EPISODE,
          "videos/title-1/season-1/episode-1/",
        );
        expect(prismaMock.episode.delete).toHaveBeenCalledWith({ where: { id: "episode-1" } });

        expect(result).toEqual({ id: episode.id, seasonId: episode.seasonId });
      });
    });
  });

  describe("transcode", () => {
    describe("when episode does not exist", () => {
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.transcode("non-existent");
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when episode exists", () => {
      const episode = { id: "episode-1" };
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
        videoTranscoderServiceMock.scheduleTranscodeVideo.mockResolvedValue(undefined as any);
      });

      test("should schedule transcode", async () => {
        await service.transcode("episode-1");
        expect(videoTranscoderServiceMock.scheduleTranscodeVideo).toHaveBeenCalledWith({
          id: "episode-1",
          type: VideoType.EPISODE,
        });
      });
    });
  });

  describe("startUpload", () => {
    describe("when episode does not exist", () => {
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.startUpload("non-existent", 1000);
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when episode exists", () => {
      const episode = { id: "episode-1" };
      const startResponse = { uploadId: "upload-1", partSize: 8, parts: [] };
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
        (s3ServiceMock.startMultipartUpload as jest.Mock).mockResolvedValue(startResponse);
      });

      test("should start a multipart upload", async () => {
        const result = await service.startUpload("episode-1", 1000);
        expect(s3ServiceMock.startMultipartUpload).toHaveBeenCalledWith(
          "episode-1",
          BucketType.RAW,
          1000,
        );
        expect(result).toEqual(startResponse);
      });
    });
  });

  describe("completeUpload", () => {
    describe("when episode does not exist", () => {
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.completeUpload("non-existent", "upload-1", []);
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when episode exists", () => {
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue({ id: "episode-1" });
      });

      test("should complete the multipart upload", async () => {
        const parts = [{ partNumber: 1, eTag: "etag-1" }];
        await service.completeUpload("episode-1", "upload-1", parts);
        expect(s3ServiceMock.completeMultipartUpload).toHaveBeenCalledWith(
          "episode-1",
          BucketType.RAW,
          "upload-1",
          parts,
        );
      });
    });
  });

  describe("abortUpload", () => {
    test("should abort the multipart upload", async () => {
      await service.abortUpload("episode-1", "upload-1");
      expect(s3ServiceMock.abortMultipartUpload).toHaveBeenCalledWith(
        "episode-1",
        BucketType.RAW,
        "upload-1",
      );
    });
  });

  describe("getStreamUrl", () => {
    describe("when episode does not exist", () => {
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.getStreamUrl("non-existent");
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when episode exists", () => {
      const episode = {
        id: "episode-1",
        seasonId: "season-1",
        season: { titleId: "title-1" },
      };
      const url = "stream-url";
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
        s3ServiceMock.getReadPresignedUrl.mockResolvedValue(url);
      });

      test("should return stream url", async () => {
        const result = await service.getStreamUrl("episode-1");
        expect(s3ServiceMock.getReadPresignedUrl).toHaveBeenCalledWith(
          "videos/title-1/season-1/episode-1/master.m3u8",
          BucketType.PROCESSED,
        );
        expect(result).toEqual({ url });
      });
    });
  });
});
