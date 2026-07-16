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
    describe("when type is episode", () => {
      describe("when progress is found", () => {
        const progressData = { progress: 50 };

        beforeEach(() => {
          (videoTranscoderServiceMock.getProgress as jest.Mock).mockResolvedValue(progressData);
        });

        test("should return progress for episode", async () => {
          const result = await controller.getProgress("vid-1", VideoType.EPISODE);
          expect(videoTranscoderServiceMock.getProgress).toHaveBeenCalledWith(
            "vid-1",
            VideoType.EPISODE,
          );
          expect(result).toEqual(progressData);
        });
      });

      describe("when progress is not found", () => {
        beforeEach(() => {
          (videoTranscoderServiceMock.getProgress as jest.Mock).mockResolvedValue(null);
        });

        test("should throw NotFoundException", async () => {
          const action = controller.getProgress("vid-1", VideoType.EPISODE);
          await expect(action).rejects.toThrow(NotFoundException);
        });
      });
    });

    describe("when type is movie", () => {
      const progressData = { progress: 80 };

      beforeEach(() => {
        (videoTranscoderServiceMock.getProgress as jest.Mock).mockResolvedValue(progressData);
      });

      test("should return progress for movie", async () => {
        const result = await controller.getProgress("vid-1", VideoType.MOVIE);
        expect(videoTranscoderServiceMock.getProgress).toHaveBeenCalledWith(
          "vid-1",
          VideoType.MOVIE,
        );
        expect(result).toEqual(progressData);
      });
    });
  });
});
