import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FilterRule } from "../../../common/pagination/filter-rule.enum";
import { EpisodeService } from "../../../services/episode/episode.service";
import { EpisodeExistsPipe } from "../../../services/episode/utils/episode-exists.pipe";
import { MediaAssetService } from "../../../services/media-asset/media-asset.service";
import { PrismaService } from "../../../services/prisma/prisma.service";
import { VideoType } from "../../../services/queues/video-transcoder/enums/video-type.enum";
import { EpisodesController } from "./episodes.controller";
import { EpisodesService } from "./episodes.service";

describe("EpisodeController", () => {
  let controller: EpisodesController;
  let episodeServiceMock: jest.Mocked<EpisodeService>;
  let mediaAssetServiceMock: jest.Mocked<MediaAssetService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EpisodesController],
      providers: [
        EpisodeExistsPipe,
        { provide: MediaAssetService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        {
          provide: EpisodeService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            transcode: jest.fn(),
            startUpload: jest.fn(),
            completeUpload: jest.fn(),
            abortUpload: jest.fn(),
            locate: jest.fn(),
          },
        },
        EpisodesService,
        { provide: MediaAssetService, useValue: { getPlaybackUrl: jest.fn() } },
      ],
    }).compile();

    controller = module.get<EpisodesController>(EpisodesController);
    episodeServiceMock = module.get(EpisodeService) as jest.Mocked<EpisodeService>;
    mediaAssetServiceMock = module.get(MediaAssetService) as jest.Mocked<MediaAssetService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    describe("should return the created episode", () => {
      it("if valid data is provided", async () => {
        const createData = {
          seasonId: "season-1",
          number: 1,
          name: "Episode 1",
          description: "Desc",
        };
        const createdEpisode = { id: "episode-1", ...createData };
        (episodeServiceMock.create as jest.Mock).mockResolvedValue(createdEpisode);

        const result = await controller.create(createData as any);

        expect(episodeServiceMock.create).toHaveBeenCalledWith(createData);
        expect(result).toEqual(createdEpisode);
      });
    });
  });

  describe("findAll", () => {
    describe("should return the list of episodes", () => {
      it("if a seasonId filter is provided", async () => {
        const episodesResponse = [{ id: "episode-1" }];
        (episodeServiceMock.findAll as jest.Mock).mockResolvedValue(episodesResponse);
        const filters = [{ property: "seasonId", rule: FilterRule.EQ, value: "season-1" }];

        const result = await controller.findAll(filters);

        expect(episodeServiceMock.findAll).toHaveBeenCalledWith(filters, undefined);
        expect(result).toEqual(episodesResponse);
      });

      it("if no filters are provided", async () => {
        const episodesResponse = [{ id: "episode-1" }];
        (episodeServiceMock.findAll as jest.Mock).mockResolvedValue(episodesResponse);

        const result = await controller.findAll([]);

        expect(episodeServiceMock.findAll).toHaveBeenCalledWith([], undefined);
        expect(result).toEqual(episodesResponse);
      });
    });
  });

  describe("findOne", () => {
    describe("should return the episode", () => {
      it("if the episode exists", async () => {
        const episode = { id: "episode-1" };
        (episodeServiceMock.findOne as jest.Mock).mockResolvedValue(episode);

        const result = await controller.findOne("episode-1");

        expect(episodeServiceMock.findOne).toHaveBeenCalledWith("episode-1");
        expect(result).toEqual(episode);
      });
    });

    describe("should throw NotFoundException", () => {
      it("if the episode does not exist", async () => {
        (episodeServiceMock.findOne as jest.Mock).mockResolvedValue(null);

        const action = controller.findOne("non-existent");

        await expect(action).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe("update", () => {
    describe("should return the updated episode", () => {
      it("if valid data is provided", async () => {
        const updateData = { number: 1, name: "New Episode", description: "Desc" };
        const updatedEpisode = { id: "episode-1", name: "New Episode" };
        (episodeServiceMock.update as jest.Mock).mockResolvedValue(updatedEpisode);

        const result = await controller.update("episode-1", updateData);

        expect(episodeServiceMock.update).toHaveBeenCalledWith("episode-1", updateData);
        expect(result).toEqual(updatedEpisode);
      });
    });
  });

  describe("delete", () => {
    describe("should return the deleted episode", () => {
      it("if called with an existing id", async () => {
        const deletedEpisode = { id: "episode-1" };
        (episodeServiceMock.delete as jest.Mock).mockResolvedValue(deletedEpisode);

        const result = await controller.delete("episode-1");

        expect(episodeServiceMock.delete).toHaveBeenCalledWith("episode-1");
        expect(result).toEqual(deletedEpisode);
      });
    });
  });

  describe("getStreamUrl", () => {
    it("should sign a playback URL for where the episode lives", async () => {
      const location = {
        type: VideoType.EPISODE,
        titleId: "t-1",
        seasonId: "s-1",
        episodeId: "episode-1",
      };
      (episodeServiceMock.locate as jest.Mock).mockResolvedValue(location);
      (mediaAssetServiceMock.getPlaybackUrl as jest.Mock).mockResolvedValue({ url: "stream-url" });

      const result = await controller.getStreamUrl("episode-1");

      expect(episodeServiceMock.locate).toHaveBeenCalledWith("episode-1");
      expect(mediaAssetServiceMock.getPlaybackUrl).toHaveBeenCalledWith(location);
      expect(result).toEqual({ url: "stream-url" });
    });
  });
});
