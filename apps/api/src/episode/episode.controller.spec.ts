import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FilterRule } from "../common/pagination/filter-rule.enum";
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
            startUpload: jest.fn(),
            completeUpload: jest.fn(),
            abortUpload: jest.fn(),
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

  describe("transcode", () => {
    describe("should call the transcode method", () => {
      it("if called with an existing id", async () => {
        (episodeServiceMock.transcode as jest.Mock).mockResolvedValue(undefined);

        await controller.transcode("episode-1");

        expect(episodeServiceMock.transcode).toHaveBeenCalledWith("episode-1");
      });
    });
  });

  describe("startUpload", () => {
    describe("should start a multipart upload", () => {
      it("if called with a fileSize", async () => {
        const startResponse = { uploadId: "upload-1", partSize: 8, parts: [] };
        (episodeServiceMock.startUpload as jest.Mock).mockResolvedValue(startResponse);

        const result = await controller.startUpload("episode-1", { fileSize: 1000 });

        expect(episodeServiceMock.startUpload).toHaveBeenCalledWith("episode-1", 1000);
        expect(result).toEqual(startResponse);
      });
    });
  });

  describe("completeUpload", () => {
    describe("should complete the multipart upload", () => {
      it("if called with an uploadId and parts", async () => {
        const dto = { uploadId: "upload-1", parts: [{ partNumber: 1, eTag: "etag-1" }] };

        await controller.completeUpload("episode-1", dto);

        expect(episodeServiceMock.completeUpload).toHaveBeenCalledWith(
          "episode-1",
          "upload-1",
          dto.parts,
        );
      });
    });
  });

  describe("abortUpload", () => {
    describe("should abort the multipart upload", () => {
      it("if called with an uploadId", async () => {
        await controller.abortUpload("episode-1", "upload-1");

        expect(episodeServiceMock.abortUpload).toHaveBeenCalledWith("episode-1", "upload-1");
      });
    });
  });

  describe("getStreamUrl", () => {
    describe("should return the stream URL", () => {
      it("if called with an existing id", async () => {
        const urlResponse = { url: "stream-url" };
        (episodeServiceMock.getStreamUrl as jest.Mock).mockResolvedValue(urlResponse);

        const result = await controller.getStreamUrl("episode-1");

        expect(episodeServiceMock.getStreamUrl).toHaveBeenCalledWith("episode-1");
        expect(result).toEqual(urlResponse);
      });
    });
  });
});
