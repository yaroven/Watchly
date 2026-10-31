import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { VideoType } from "../../../services/queues/video-transcoder/enums/video-type.enum";
import { VideoTranscodeStateService } from "../../../services/queues/video-transcoder/video-transcode-state.service";
import { VideoTranscoderController } from "./video-transcoder.controller";

describe("VideoTranscoderController", () => {
  let controller: VideoTranscoderController;
  let stateMock: jest.Mocked<VideoTranscodeStateService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoTranscoderController],
      providers: [
        {
          provide: VideoTranscodeStateService,
          useValue: {
            getProgress: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VideoTranscoderController>(VideoTranscoderController);
    stateMock = module.get(VideoTranscodeStateService) as jest.Mocked<VideoTranscodeStateService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getProgress", () => {
    describe("should return the progress", () => {
      it("if type is episode and progress is found", async () => {
        const progressData = { id: "progress-1", episodeId: "vid-1", progressPercentage: 50 };
        (stateMock.getProgress as jest.Mock).mockResolvedValue(progressData);

        const result = await controller.getProgress("vid-1", VideoType.EPISODE);

        expect(stateMock.getProgress).toHaveBeenCalledWith("vid-1", VideoType.EPISODE);
        expect(result).toEqual(progressData);
      });

      it("if type is movie", async () => {
        const progressData = { id: "progress-2", titleId: "vid-1", progressPercentage: 80 };
        (stateMock.getProgress as jest.Mock).mockResolvedValue(progressData);

        const result = await controller.getProgress("vid-1", VideoType.MOVIE);

        expect(stateMock.getProgress).toHaveBeenCalledWith("vid-1", VideoType.MOVIE);
        expect(result).toEqual(progressData);
      });
    });

    describe("should throw NotFoundException", () => {
      it("if type is episode and progress is not found", async () => {
        (stateMock.getProgress as jest.Mock).mockResolvedValue(null);

        const action = controller.getProgress("vid-1", VideoType.EPISODE);

        await expect(action).rejects.toThrow(NotFoundException);
      });
    });
  });
});
