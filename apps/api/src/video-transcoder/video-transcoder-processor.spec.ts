import { Test, TestingModule } from "@nestjs/testing";
import { TranscodingStatus } from "@prisma/client";
import { Job } from "bullmq";
import * as fs from "fs-extra";
import { TranscodeVideoDto } from "./dto/request/transcode-video.dto";
import { VideoType } from "./enums/video-type.enum";
import { VideoTranscoderProcessor } from "./video-transcoder-processor";
import { TranscodeAbortedError, VideoTranscoderService } from "./video-transcoder.service";

jest.mock("fs-extra");

describe("VideoTranscoderProcessor", () => {
  let processor: VideoTranscoderProcessor;
  let videoTranscoderServiceMock: jest.Mocked<VideoTranscoderService>;

  const mockJob = (data: TranscodeVideoDto): Job<TranscodeVideoDto> =>
    ({
      id: "job-123",
      data,
    }) as unknown as Job<TranscodeVideoDto>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoTranscoderProcessor,
        {
          provide: VideoTranscoderService,
          useValue: {
            updateStatus: jest.fn(),
            updateProgress: jest.fn(),
            transcodeVideo: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<VideoTranscoderProcessor>(VideoTranscoderProcessor);
    videoTranscoderServiceMock = module.get(
      VideoTranscoderService,
    ) as jest.Mocked<VideoTranscoderService>;
  });

  describe("process", () => {
    test("should set PROCESSING status and progress to 0 on start", async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      videoTranscoderServiceMock.transcodeVideo.mockResolvedValue(undefined);

      const job = mockJob({ id: "ep-1", type: VideoType.EPISODE });

      await processor.process(job);

      expect(videoTranscoderServiceMock.updateStatus).toHaveBeenCalledWith(
        "ep-1",
        VideoType.EPISODE,
        TranscodingStatus.PROCESSING,
      );
      expect(videoTranscoderServiceMock.updateProgress).toHaveBeenCalledWith(
        "ep-1",
        VideoType.EPISODE,
        0,
      );
    });

    test("should create temp directory before transcoding", async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      videoTranscoderServiceMock.transcodeVideo.mockResolvedValue(undefined);

      const job = mockJob({ id: "ep-1", type: VideoType.EPISODE });

      await processor.process(job);

      expect(fs.ensureDir).toHaveBeenCalled();
    });

    test("should call transcodeVideo with correct paths and type", async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      videoTranscoderServiceMock.transcodeVideo.mockResolvedValue(undefined);

      const job = mockJob({ id: "title-1", type: VideoType.MOVIE });

      await processor.process(job);

      expect(videoTranscoderServiceMock.transcodeVideo).toHaveBeenCalledWith(
        "title-1",
        expect.stringContaining("title-1"),
        expect.stringContaining("output"),
        VideoType.MOVIE,
      );
    });

    test("should set COMPLETED status and progress to 100 on success", async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      videoTranscoderServiceMock.transcodeVideo.mockResolvedValue(undefined);

      const job = mockJob({ id: "ep-1", type: VideoType.EPISODE });

      await processor.process(job);

      expect(videoTranscoderServiceMock.updateStatus).toHaveBeenCalledWith(
        "ep-1",
        VideoType.EPISODE,
        TranscodingStatus.COMPLETED,
      );
      expect(videoTranscoderServiceMock.updateProgress).toHaveBeenCalledWith(
        "ep-1",
        VideoType.EPISODE,
        100,
      );
    });

    test("should return { result: 'success' } on successful completion", async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      videoTranscoderServiceMock.transcodeVideo.mockResolvedValue(undefined);

      const job = mockJob({ id: "ep-1", type: VideoType.EPISODE });

      const result = await processor.process(job);

      expect(result).toEqual({ result: "success" });
    });

    test("should return { result: 'aborted' } when TranscodeAbortedError is thrown", async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      videoTranscoderServiceMock.transcodeVideo.mockRejectedValue(
        new TranscodeAbortedError("Job was cancelled"),
      );

      const job = mockJob({ id: "ep-1", type: VideoType.EPISODE });

      const result = await processor.process(job);

      expect(result).toEqual({ result: "aborted" });
      // Should NOT set FAILED status on abort
      expect(videoTranscoderServiceMock.updateStatus).not.toHaveBeenCalledWith(
        "ep-1",
        VideoType.EPISODE,
        TranscodingStatus.FAILED,
      );
    });

    test("should set FAILED status on non-abort errors", async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      videoTranscoderServiceMock.transcodeVideo.mockRejectedValue(new Error("ffmpeg error"));

      const job = mockJob({ id: "ep-1", type: VideoType.EPISODE });

      await expect(processor.process(job)).rejects.toThrow("ffmpeg error");

      expect(videoTranscoderServiceMock.updateStatus).toHaveBeenCalledWith(
        "ep-1",
        VideoType.EPISODE,
        TranscodingStatus.FAILED,
      );
    });

    test("should cleanup temp directory in finally block on success", async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      videoTranscoderServiceMock.transcodeVideo.mockResolvedValue(undefined);
      (fs.remove as jest.Mock).mockResolvedValue(undefined);

      const job = mockJob({ id: "ep-1", type: VideoType.EPISODE });

      await processor.process(job);

      expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining("transcode-job-123"));
    });

    test("should cleanup temp directory in finally block on failure", async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      videoTranscoderServiceMock.transcodeVideo.mockRejectedValue(new Error("error"));
      (fs.remove as jest.Mock).mockResolvedValue(undefined);

      const job = mockJob({ id: "ep-1", type: VideoType.EPISODE });

      await expect(processor.process(job)).rejects.toThrow();

      expect(fs.remove).toHaveBeenCalled();
    });

    test("should cleanup temp directory in finally block on abort", async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      videoTranscoderServiceMock.transcodeVideo.mockRejectedValue(
        new TranscodeAbortedError("cancelled"),
      );
      (fs.remove as jest.Mock).mockResolvedValue(undefined);

      const job = mockJob({ id: "ep-1", type: VideoType.EPISODE });

      await processor.process(job);

      expect(fs.remove).toHaveBeenCalled();
    });
  });
});
