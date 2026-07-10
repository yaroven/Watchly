import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { EpisodeService } from "./episode.service";
import { PrismaService } from "../prisma/prisma.service";
import { S3Service } from "../s3/s3.service";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { CreateEpisodeDto } from "./dto/request/create-episode.dto";
import { UpdateEpisodeDto } from "./dto/request/update-episode.dto";

describe("EpisodeService", () => {
  let service: EpisodeService;
  let prismaService: PrismaService;
  let s3Service: S3Service;
  let videoTranscoderService: VideoTranscoderService;

  const mockPrismaService = {
    episode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockS3Service = {
    deleteObject: jest.fn(),
    deleteFolder: jest.fn(),
    getUploadPresignedUrl: jest.fn(),
    getReadPresignedUrl: jest.fn(),
  };

  const mockVideoTranscoderService = {
    cancelScheduledTranscodes: jest.fn(),
    scheduleTranscodeVideo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EpisodeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: VideoTranscoderService,
          useValue: mockVideoTranscoderService,
        },
      ],
    }).compile();

    service = module.get<EpisodeService>(EpisodeService);
    prismaService = module.get<PrismaService>(PrismaService);
    s3Service = module.get<S3Service>(S3Service);
    videoTranscoderService = module.get<VideoTranscoderService>(VideoTranscoderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create an episode successfully", async () => {
      const createEpisodeDto: CreateEpisodeDto = {
        seasonId: "season-1",
        number: 1,
        name: "Test Episode",
        description: "Test overview",
      };

      const mockEpisode = {
        id: "episode-1",
        ...createEpisodeDto,
      };

      mockPrismaService.episode.findFirst.mockResolvedValue(null);
      mockPrismaService.episode.create.mockResolvedValue(mockEpisode);

      const result = await service.create(createEpisodeDto);

      expect(result).toEqual(mockEpisode);
      expect(mockPrismaService.episode.findFirst).toHaveBeenCalledWith({
        where: {
          seasonId: createEpisodeDto.seasonId,
          number: createEpisodeDto.number,
        },
      });
      expect(mockPrismaService.episode.create).toHaveBeenCalledWith({
        data: createEpisodeDto,
      });
    });

    it("should throw BadRequestException if episode number already exists in season", async () => {
      const createEpisodeDto: CreateEpisodeDto = {
        seasonId: "season-1",
        number: 1,
        name: "Test Episode",
        description: "Test overview",
      };

      mockPrismaService.episode.findFirst.mockResolvedValue({
        id: "existing-episode",
        number: 1,
      });

      await expect(service.create(createEpisodeDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createEpisodeDto)).rejects.toThrow(
        "Episode with number 1 already exists in this season",
      );
    });
  });

  describe("findAll", () => {
    it("should return all episodes when no seasonId is provided", async () => {
      const mockEpisodes = [
        { id: "episode-1", number: 1 },
        { id: "episode-2", number: 2 },
      ];

      mockPrismaService.episode.findMany.mockResolvedValue(mockEpisodes);

      const result = await service.findAll();

      expect(result).toEqual(mockEpisodes);
      expect(mockPrismaService.episode.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { number: "asc" },
      });
    });

    it("should return episodes for specific season when seasonId is provided", async () => {
      const seasonId = "season-1";
      const mockEpisodes = [
        { id: "episode-1", number: 1, seasonId },
      ];

      mockPrismaService.episode.findMany.mockResolvedValue(mockEpisodes);

      const result = await service.findAll(seasonId);

      expect(result).toEqual(mockEpisodes);
      expect(mockPrismaService.episode.findMany).toHaveBeenCalledWith({
        where: { seasonId },
        orderBy: { number: "asc" },
      });
    });
  });

  describe("findOne", () => {
    it("should return an episode by id", async () => {
      const mockEpisode = { id: "episode-1", number: 1 };
      mockPrismaService.episode.findUnique.mockResolvedValue(mockEpisode);

      const result = await service.findOne("episode-1");

      expect(result).toEqual(mockEpisode);
      expect(mockPrismaService.episode.findUnique).toHaveBeenCalledWith({
        where: { id: "episode-1" },
      });
    });

    it("should return null if episode not found", async () => {
      mockPrismaService.episode.findUnique.mockResolvedValue(null);

      const result = await service.findOne("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("findOneDetailed", () => {
    it("should return episode with relations", async () => {
      const mockEpisode = {
        id: "episode-1",
        number: 1,
        season: {
          id: "season-1",
          title: {
            id: "title-1",
            name: "Test Title",
          },
        },
      };

      mockPrismaService.episode.findUnique.mockResolvedValue(mockEpisode);

      const result = await service.findOneDetailed("episode-1");

      expect(result).toEqual(mockEpisode);
      expect(mockPrismaService.episode.findUnique).toHaveBeenCalledWith({
        where: { id: "episode-1" },
        include: { season: { include: { title: true } } },
      });
    });
  });

  describe("update", () => {
    it("should update an episode successfully", async () => {
      const updateEpisodeDto: UpdateEpisodeDto = {
        name: "Updated Episode",
      };

      const mockEpisode = {
        id: "episode-1",
        number: 1,
        seasonId: "season-1",
      };

      const mockUpdatedEpisode = {
        ...mockEpisode,
        ...updateEpisodeDto,
      };

      mockPrismaService.episode.findUnique.mockResolvedValue(mockEpisode);
      mockPrismaService.episode.findFirst.mockResolvedValue(null);
      mockPrismaService.episode.update.mockResolvedValue(mockUpdatedEpisode);

      const result = await service.update("episode-1", updateEpisodeDto);

      expect(result).toEqual(mockUpdatedEpisode);
      expect(mockPrismaService.episode.update).toHaveBeenCalledWith({
        where: { id: "episode-1" },
        data: updateEpisodeDto,
      });
    });

    it("should throw BadRequestException if episode not found", async () => {
      mockPrismaService.episode.findUnique.mockResolvedValue(null);

      await expect(service.update("non-existent", { name: "Test" })).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException if number conflicts with existing episode", async () => {
      const updateEpisodeDto: UpdateEpisodeDto = {
        number: 2,
      };

      const mockEpisode = {
        id: "episode-1",
        number: 1,
        seasonId: "season-1",
      };

      mockPrismaService.episode.findUnique.mockResolvedValue(mockEpisode);
      mockPrismaService.episode.findFirst.mockResolvedValue({
        id: "episode-2",
        number: 2,
        seasonId: "season-1",
      });

      await expect(service.update("episode-1", updateEpisodeDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("delete", () => {
    it("should delete an episode successfully", async () => {
      const mockEpisode = {
        id: "episode-1",
        seasonId: "season-1",
        season: {
          id: "season-1",
          titleId: "title-1",
        },
      };

      mockPrismaService.episode.findUnique.mockResolvedValue(mockEpisode);
      mockPrismaService.episode.delete.mockResolvedValue(mockEpisode);

      const result = await service.delete("episode-1");

      expect(result).toEqual(mockEpisode);
      expect(mockVideoTranscoderService.cancelScheduledTranscodes).toHaveBeenCalledWith(
        "episode-1",
        VideoType.EPISODE,
      );
      expect(mockS3Service.deleteObject).toHaveBeenCalledWith(
        "episode-1",
        expect.any(String),
      );
      expect(mockS3Service.deleteFolder).toHaveBeenCalled();
      expect(mockPrismaService.episode.delete).toHaveBeenCalledWith({
        where: { id: "episode-1" },
      });
    });

    it("should throw BadRequestException if episode not found", async () => {
      mockPrismaService.episode.findUnique.mockResolvedValue(null);

      await expect(service.delete("non-existent")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("transcode", () => {
    it("should schedule video transcoding", async () => {
      const mockEpisode = { id: "episode-1", number: 1 };
      mockPrismaService.episode.findUnique.mockResolvedValue(mockEpisode);

      await service.transcode("episode-1");

      expect(mockVideoTranscoderService.scheduleTranscodeVideo).toHaveBeenCalledWith({
        id: "episode-1",
        type: VideoType.EPISODE,
      });
    });

    it("should throw BadRequestException if episode not found", async () => {
      mockPrismaService.episode.findUnique.mockResolvedValue(null);

      await expect(service.transcode("non-existent")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("getUploadUrl", () => {
    it("should return presigned upload URL", async () => {
      const mockEpisode = { id: "episode-1", number: 1 };
      const mockUrl = "https://example.com/upload-url";

      mockPrismaService.episode.findUnique.mockResolvedValue(mockEpisode);
      mockS3Service.getUploadPresignedUrl.mockResolvedValue(mockUrl);

      const result = await service.getUploadUrl("episode-1");

      expect(result).toEqual({ url: mockUrl });
      expect(mockS3Service.getUploadPresignedUrl).toHaveBeenCalledWith(
        "episode-1",
        expect.any(String),
      );
    });

    it("should throw BadRequestException if episode not found", async () => {
      mockPrismaService.episode.findUnique.mockResolvedValue(null);

      await expect(service.getUploadUrl("non-existent")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("getStreamUrl", () => {
    it("should return presigned stream URL", async () => {
      const mockEpisode = {
        id: "episode-1",
        seasonId: "season-1",
        season: {
          id: "season-1",
          titleId: "title-1",
        },
      };
      const mockUrl = "https://example.com/stream-url";

      mockPrismaService.episode.findUnique.mockResolvedValue(mockEpisode);
      mockS3Service.getReadPresignedUrl.mockResolvedValue(mockUrl);

      const result = await service.getStreamUrl("episode-1");

      expect(result).toEqual({ url: mockUrl });
      expect(mockS3Service.getReadPresignedUrl).toHaveBeenCalledWith(
        `videos/title-1/season-1/episode-1/master.m3u8`,
        expect.any(String),
      );
    });

    it("should throw BadRequestException if episode not found", async () => {
      mockPrismaService.episode.findUnique.mockResolvedValue(null);

      await expect(service.getStreamUrl("non-existent")).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
