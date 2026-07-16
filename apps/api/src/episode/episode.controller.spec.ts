import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { EpisodeController } from "./episode.controller";
import { EpisodeService } from "./episode.service";

describe("EpisodeController", () => {
  let controller: EpisodeController;
  let episodeServiceMock: jest.Mocked<EpisodeService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EpisodeController],
      providers: [
        {
          provide: EpisodeService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            transcode: jest.fn(),
            getUploadUrl: jest.fn(),
            getStreamUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EpisodeController>(EpisodeController);
    episodeServiceMock = module.get(EpisodeService) as jest.Mocked<EpisodeService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createData = { seasonId: "season-1", number: 1, name: "Episode 1", description: "Desc" };
    const createdEpisode = { id: "episode-1", ...createData };

    beforeEach(() => {
      (episodeServiceMock.create as jest.Mock).mockResolvedValue(createdEpisode);
    });

    test("should return created episode", async () => {
      const result = await controller.create(createData as any);
      expect(episodeServiceMock.create).toHaveBeenCalledWith(createData);
      expect(result).toEqual(createdEpisode);
    });
  });

  describe("findAll", () => {
    const episodesResponse = [{ id: "episode-1" }];

    beforeEach(() => {
      (episodeServiceMock.findAll as jest.Mock).mockResolvedValue(episodesResponse);
    });

    test("should return list of episodes for seasonId", async () => {
      const result = await controller.findAll("season-1");
      expect(episodeServiceMock.findAll).toHaveBeenCalledWith("season-1");
      expect(result).toEqual(episodesResponse);
    });

    test("should return list of episodes without seasonId", async () => {
      const result = await controller.findAll();
      expect(episodeServiceMock.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(episodesResponse);
    });
  });

  describe("findOne", () => {
    describe("when episode exists", () => {
      const episode = { id: "episode-1" };

      beforeEach(() => {
        (episodeServiceMock.findOne as jest.Mock).mockResolvedValue(episode);
      });

      test("should return the episode", async () => {
        const result = await controller.findOne("episode-1");
        expect(episodeServiceMock.findOne).toHaveBeenCalledWith("episode-1");
        expect(result).toEqual(episode);
      });
    });

    describe("when episode does not exist", () => {
      beforeEach(() => {
        (episodeServiceMock.findOne as jest.Mock).mockResolvedValue(null);
      });

      test("should throw NotFoundException", async () => {
        const action = controller.findOne("non-existent");
        await expect(action).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe("update", () => {
    const updateData = { name: "New Episode" };
    const updatedEpisode = { id: "episode-1", name: "New Episode" };

    beforeEach(() => {
      (episodeServiceMock.update as jest.Mock).mockResolvedValue(updatedEpisode);
    });

    test("should return updated episode", async () => {
      const result = await controller.update("episode-1", updateData);
      expect(episodeServiceMock.update).toHaveBeenCalledWith("episode-1", updateData);
      expect(result).toEqual(updatedEpisode);
    });
  });

  describe("delete", () => {
    const deletedEpisode = { id: "episode-1" };

    beforeEach(() => {
      (episodeServiceMock.delete as jest.Mock).mockResolvedValue(deletedEpisode);
    });

    test("should return deleted episode", async () => {
      const result = await controller.delete("episode-1");
      expect(episodeServiceMock.delete).toHaveBeenCalledWith("episode-1");
      expect(result).toEqual(deletedEpisode);
    });
  });

  describe("transcode", () => {
    beforeEach(() => {
      (episodeServiceMock.transcode as jest.Mock).mockResolvedValue(undefined);
    });

    test("should call transcode method", async () => {
      await controller.transcode("episode-1");
      expect(episodeServiceMock.transcode).toHaveBeenCalledWith("episode-1");
    });
  });

  describe("getUploadUrl", () => {
    const urlResponse = { url: "upload-url" };

    beforeEach(() => {
      (episodeServiceMock.getUploadUrl as jest.Mock).mockResolvedValue(urlResponse);
    });

    test("should return upload URL", async () => {
      const result = await controller.getUploadUrl("episode-1");
      expect(episodeServiceMock.getUploadUrl).toHaveBeenCalledWith("episode-1");
      expect(result).toEqual(urlResponse);
    });
  });

  describe("getStreamUrl", () => {
    const urlResponse = { url: "stream-url" };

    beforeEach(() => {
      (episodeServiceMock.getStreamUrl as jest.Mock).mockResolvedValue(urlResponse);
    });

    test("should return stream URL", async () => {
      const result = await controller.getStreamUrl("episode-1");
      expect(episodeServiceMock.getStreamUrl).toHaveBeenCalledWith("episode-1");
      expect(result).toEqual(urlResponse);
    });
  });
});
