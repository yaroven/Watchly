import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { FilterRule } from "../../common/pagination/filter-rule.enum";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PrismaService } from "../prisma/prisma.service";
import { VideoType } from "../queues/video-transcoder/enums/video-type.enum";
import { EpisodeService } from "./episode.service";

describe("EpisodeService", () => {
  let service: EpisodeService;
  let prismaMock: jest.Mocked<PrismaService>;
  let mediaAssetServiceMock: jest.Mocked<MediaAssetService>;

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
          provide: MediaAssetService,
          useValue: {
            startUpload: jest.fn(),
            completeUpload: jest.fn(),
            abortUpload: jest.fn(),
            scheduleTranscode: jest.fn(),
            getPlaybackUrl: jest.fn(),
            cleanupVideoAsset: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EpisodeService>(EpisodeService);
    prismaMock = module.get(PrismaService) as jest.Mocked<PrismaService>;
    mediaAssetServiceMock = module.get(MediaAssetService) as jest.Mocked<MediaAssetService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createData = { seasonId: "season-1", number: 1, name: "Episode 1", description: "Desc" };

    describe("should create and return the episode", () => {
      it("if the episode does not already exist", async () => {
        const createdEpisode = { id: "episode-1", ...createData };
        (prismaMock.episode.create as jest.Mock).mockResolvedValue(createdEpisode);

        const result = await service.create(createData as any);

        expect(prismaMock.episode.create).toHaveBeenCalledWith({ data: createData });
        expect(result).toEqual(createdEpisode);
      });
    });

    describe("should throw BadRequestException instead of the raw Prisma error", () => {
      it("if an episode with the same number already exists in the season", async () => {
        (prismaMock.episode.create as jest.Mock).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "test",
          }),
        );

        const action = service.create(createData as any);

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe("findAll", () => {
    describe("should return episodes for the season", () => {
      it("if a seasonId filter is provided", async () => {
        const episodes = [{ id: "episode-1" }, { id: "episode-2" }];
        (prismaMock.episode.findMany as jest.Mock).mockResolvedValue(episodes);

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

    describe("should return all episodes", () => {
      it("if no filters are provided", async () => {
        const episodes = [{ id: "episode-1" }, { id: "episode-2" }];
        (prismaMock.episode.findMany as jest.Mock).mockResolvedValue(episodes);

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
    describe("should return the detailed episode", () => {
      it("if the episode is found", async () => {
        const episode = { id: "episode-1" };
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);

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
    describe("should return the episode", () => {
      it("if the episode exists", async () => {
        const episode = { id: "episode-1" };
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);

        const result = await service.findOne("episode-1");

        expect(prismaMock.episode.findUnique).toHaveBeenCalledWith({ where: { id: "episode-1" } });
        expect(result).toEqual(episode);
      });
    });

    describe("should return null", () => {
      it("if the episode does not exist", async () => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);

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

    describe("should throw NotFoundException", () => {
      it("if the episode does not exist", async () => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.update("non-existent", updateData);

        await expect(action).rejects.toThrow(NotFoundException);
      });

      it("if the episode exists but the number is already taken by another episode", async () => {
        const episode = { id: "episode-1", seasonId: "season-1" };
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
        (prismaMock.episode.findFirst as jest.Mock).mockResolvedValue({ id: "existing-id" });

        const action = service.update("episode-1", updateData);

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("should update and return the episode", () => {
      it("if the episode exists and the number is available", async () => {
        const episode = { id: "episode-1", seasonId: "season-1" };
        const updatedEpisode = { ...episode, ...updateData };
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
        (prismaMock.episode.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.episode.update as jest.Mock).mockResolvedValue(updatedEpisode);

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

    describe("should throw BadRequestException instead of the raw Prisma error", () => {
      it("if a concurrent request wins the race after the pre-check", async () => {
        const episode = { id: "episode-1", seasonId: "season-1" };
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
        (prismaMock.episode.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.episode.update as jest.Mock).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "test",
          }),
        );

        const action = service.update("episode-1", updateData);

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe("delete", () => {
    describe("should throw NotFoundException", () => {
      it("if the episode does not exist", async () => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.delete("non-existent");

        await expect(action).rejects.toThrow(NotFoundException);
      });
    });

    describe("should delete the episode and clean up its related media", () => {
      it("if the episode exists", async () => {
        const episode = {
          id: "episode-1",
          seasonId: "season-1",
          season: { titleId: "title-1" },
        };
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
        (mediaAssetServiceMock.cleanupVideoAsset as jest.Mock).mockResolvedValue(undefined);
        (prismaMock.episode.delete as jest.Mock).mockResolvedValue(episode);

        const result = await service.delete("episode-1");

        expect(mediaAssetServiceMock.cleanupVideoAsset).toHaveBeenCalledWith(
          "episode-1",
          VideoType.EPISODE,
          "videos/title-1/season-1/episode-1/",
        );
        expect(prismaMock.episode.delete).toHaveBeenCalledWith({ where: { id: "episode-1" } });
        expect(result).toEqual({ id: episode.id, seasonId: episode.seasonId });
      });
    });
  });

  describe("getStreamUrl", () => {
    describe("should throw NotFoundException", () => {
      it("if the episode does not exist", async () => {
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.getStreamUrl("non-existent");

        await expect(action).rejects.toThrow(NotFoundException);
      });
    });

    describe("should return the stream url", () => {
      it("if the episode exists", async () => {
        const episode = {
          id: "episode-1",
          seasonId: "season-1",
          season: { titleId: "title-1" },
        };
        const url = "stream-url";
        (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(episode);
        (mediaAssetServiceMock.getPlaybackUrl as jest.Mock).mockResolvedValue({ url });

        const result = await service.getStreamUrl("episode-1");

        expect(mediaAssetServiceMock.getPlaybackUrl).toHaveBeenCalledWith({
          type: VideoType.EPISODE,
          titleId: "title-1",
          seasonId: "season-1",
          episodeId: "episode-1",
        });
        expect(result).toEqual({ url });
      });
    });
  });
});
