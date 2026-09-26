import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { VideoType } from "./enums/video-type.enum";
import { VideoTranscoderController } from "./video-transcoder.controller";
import { VideoTranscoderService } from "./video-transcoder.service";

describe("VideoTranscoderController", () => {
  let controller: VideoTranscoderController;
  let videoTranscoderServiceMock: jest.Mocked<VideoTranscoderService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoTranscoderController],
      providers: [
        {
          provide: VideoTranscoderService,
          useValue: {
            getProgress: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VideoTranscoderController>(VideoTranscoderController);
    videoTranscoderServiceMock = module.get(
      VideoTranscoderService,
    ) as jest.Mocked<VideoTranscoderService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getProgress", () => {
    describe("should return the progress", () => {
      it("if type is episode and progress is found", async () => {
        const progressData = { id: "progress-1", episodeId: "vid-1", progressPercentage: 50 };
        (videoTranscoderServiceMock.getProgress as jest.Mock).mockResolvedValue(progressData);

        const result = await controller.getProgress("vid-1", VideoType.EPISODE);

        expect(videoTranscoderServiceMock.getProgress).toHaveBeenCalledWith(
          "vid-1",
          VideoType.EPISODE,
        );
        expect(result).toEqual(progressData);
      });

      it("if type is movie", async () => {
        const progressData = { id: "progress-2", titleId: "vid-1", progressPercentage: 80 };
        (videoTranscoderServiceMock.getProgress as jest.Mock).mockResolvedValue(progressData);

        const result = await controller.getProgress("vid-1", VideoType.MOVIE);

        expect(videoTranscoderServiceMock.getProgress).toHaveBeenCalledWith(
          "vid-1",
          VideoType.MOVIE,
        );
        expect(result).toEqual(progressData);
      });
    });

    describe("should throw NotFoundException", () => {
      it("if type is episode and progress is not found", async () => {
        (videoTranscoderServiceMock.getProgress as jest.Mock).mockResolvedValue(null);

        const action = controller.getProgress("vid-1", VideoType.EPISODE);

        await expect(action).rejects.toThrow(NotFoundException);
      });
    });
  });
});
