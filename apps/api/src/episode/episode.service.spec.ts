import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
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
            deleteObject: jest.fn(),
            deleteFolder: jest.fn(),
          },
        },
        {
          provide: VideoTranscoderService,
          useValue: {
            scheduleTranscodeVideo: jest.fn(),
            cancelScheduledTranscodes: jest.fn(),
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

    describe("when episode with same number exists in season", () => {
      beforeEach(() => {
        (prismaMock.episode.findFirst as jest.Mock).mockResolvedValue({ id: "existing-id" });
      });

      test("should throw BadRequestException", async () => {
        const action = service.create(createData as any);
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when episode does not exist", () => {
      const createdEpisode = { id: "episode-1", ...createData };

      beforeEach(() => {
        (prismaMock.episode.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.episode.create as jest.Mock).mockResolvedValue(createdEpisode);
      });

      test("should create and return the episode", async () => {
        const result = await service.create(createData as any);
        expect(prismaMock.episode.findFirst).toHaveBeenCalledWith({
          where: { seasonId: "season-1", number: 1 },
        });
        expect(prismaMock.episode.create).toHaveBeenCalledWith({ data: createData });
        expect(result).toEqual(createdEpisode);
      });
    });
  });

  describe("findAll", () => {
    const episodes = [{ id: "episode-1" }, { id: "episode-2" }];

    describe("when seasonId is provided", () => {
      beforeEach(() => {
        (prismaMock.episode.findMany as jest.Mock).mockResolvedValue(episodes);
      });

      test("should return episodes for the season", async () => {
        const result = await service.findAll("season-1");
        expect(prismaMock.episode.findMany).toHaveBeenCalledWith({
          where: { seasonId: "season-1" },
          orderBy: { number: "asc" },
        });
        expect(result).toEqual(episodes);
      });
    });

    describe("when seasonId is not provided", () => {
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
    describe("when number is provided", () => {
      describe("when episode not found", () => {
        beforeEach(() => {
          (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
        });

        test("should throw BadRequestException", async () => {
          const action = service.update("non-existent", { number: 2 });
          await expect(action).rejects.toThrow(BadRequestException);
        });
      });

      describe("when episode found but number already taken", () => {
        const episode = { id: "episode-1", seasonId: "season-1" };
        beforeEach(() => {
          (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
          (prismaMock.episode.findFirst as jest.Mock).mockResolvedValue({ id: "existing-id" });
        });

        test("should throw BadRequestException", async () => {
          const action = service.update("episode-1", { number: 2 });
          await expect(action).rejects.toThrow(BadRequestException);
        });
      });

      describe("when episode found and number is available", () => {
        const episode = { id: "episode-1", seasonId: "season-1" };
        const updatedEpisode = { ...episode, number: 2 };
        beforeEach(() => {
          (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
          (prismaMock.episode.findFirst as jest.Mock).mockResolvedValue(null);
          (prismaMock.episode.update as jest.Mock).mockResolvedValue(updatedEpisode);
        });

        test("should update and return the episode", async () => {
          const result = await service.update("episode-1", { number: 2 });
          expect(prismaMock.episode.findFirst).toHaveBeenCalledWith({
            where: {
              seasonId: "season-1",
              number: 2,
              id: { not: "episode-1" },
            },
          });
          expect(prismaMock.episode.update).toHaveBeenCalledWith({
            where: { id: "episode-1" },
            data: { number: 2 },
          });
          expect(result).toEqual(updatedEpisode);
        });
      });
    });

    describe("when number is not provided", () => {
      const updatedEpisode = { id: "episode-1", name: "New Name" };
      beforeEach(() => {
        (prismaMock.episode.update as jest.Mock).mockResolvedValue(updatedEpisode);
      });

      test("should update and return without checking number availability", async () => {
        const result = await service.update("episode-1", { name: "New Name" });
        expect(prismaMock.episode.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.episode.findFirst).not.toHaveBeenCalled();
        expect(prismaMock.episode.update).toHaveBeenCalledWith({
          where: { id: "episode-1" },
          data: { name: "New Name" },
        });
        expect(result).toEqual(updatedEpisode);
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
        videoTranscoderServiceMock.cancelScheduledTranscodes.mockResolvedValue(undefined as any);
        s3ServiceMock.deleteObject.mockResolvedValue(undefined as any);
        s3ServiceMock.deleteFolder.mockResolvedValue(undefined as any);
        (prismaMock.episode.delete as jest.Mock).mockResolvedValue(episode);
      });

      test("should delete episode and related media", async () => {
        const result = await service.delete("episode-1");

        expect(videoTranscoderServiceMock.cancelScheduledTranscodes).toHaveBeenCalledWith(
          "episode-1",
          VideoType.EPISODE,
        );
        expect(s3ServiceMock.deleteObject).toHaveBeenCalledWith("episode-1", BucketType.RAW);
        expect(s3ServiceMock.deleteFolder).toHaveBeenCalledWith(
          "videos/title-1/season-1/episode-1/",
          BucketType.PROCESSED,
        );
        expect(prismaMock.episode.delete).toHaveBeenCalledWith({ where: { id: "episode-1" } });

        expect(result).toEqual(episode);
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

  describe("getUploadUrl", () => {
    describe("when episode does not exist", () => {
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
      });

      test("should throw BadRequestException", async () => {
        const action = service.getUploadUrl("non-existent");
        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("when episode exists", () => {
      const episode = { id: "episode-1" };
      const url = "upload-url";
      beforeEach(() => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
        s3ServiceMock.getUploadPresignedUrl.mockResolvedValue(url);
      });

      test("should return upload url", async () => {
        const result = await service.getUploadUrl("episode-1");
        expect(s3ServiceMock.getUploadPresignedUrl).toHaveBeenCalledWith(
          "episode-1",
          BucketType.RAW,
        );
        expect(result).toEqual({ url });
      });
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
