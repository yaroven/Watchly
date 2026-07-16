import { getQueueToken } from "@nestjs/bullmq";
import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { VideoType } from "./enums/video-type.enum";
import { TranscodeAbortedError, VideoTranscoderService } from "./video-transcoder.service";

jest.mock("fs-extra", () => ({
  createWriteStream: jest.fn().mockReturnValue({
    on: jest.fn().mockImplementation(function (this: any, event: string, handler: any) {
      if (event === "finish") {
        setTimeout(handler, 0);
      }
      return this;
    }),
  }),
  createReadStream: jest.fn().mockReturnValue("mock-read-stream"),
  readdir: jest.fn().mockResolvedValue(["file1.m3u8", "file2.ts", "folder"]),
  stat: jest.fn().mockImplementation((path: string) =>
    Promise.resolve({
      isDirectory: () => path.includes("folder"),
    }),
  ),
}));

jest.mock("fluent-ffmpeg", () => {
  const m = {
    format: jest.fn().mockReturnThis(),
    addOption: jest.fn().mockReturnThis(),
    outputOptions: jest.fn().mockReturnThis(),
    output: jest.fn().mockReturnThis(),
    on: jest.fn().mockImplementation(function (this: any, event: string, handler: any) {
      if (event === "end") {
        setTimeout(handler, 0);
      }
      return this;
    }),
    run: jest.fn(),
  };
  const mockFfmpeg: any = jest.fn(() => m);
  mockFfmpeg.ffprobe = jest.fn((file: string, cb: any) => {
    cb(null, { streams: [{ width: 1920 }] });
  });
  return {
    __esModule: true,
    default: mockFfmpeg,
  };
});

describe("VideoTranscoderService", () => {
  let service: VideoTranscoderService;
  let queueMock: any;
  let prismaMock: jest.Mocked<PrismaService>;
  let s3ServiceMock: jest.Mocked<S3Service>;

  beforeEach(async () => {
    queueMock = {
      add: jest.fn(),
      getJobs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoTranscoderService,
        {
          provide: getQueueToken("video-transcode"),
          useValue: queueMock,
        },
        {
          provide: PrismaService,
          useValue: {
            episode: {
              findUnique: jest.fn(),
              updateMany: jest.fn(),
            },
            title: {
              findUnique: jest.fn(),
              updateMany: jest.fn(),
            },
            videoTranscodingProgress: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
            },
            $transaction: jest.fn().mockImplementation((ops) => Promise.all(ops)),
          },
        },
        {
          provide: S3Service,
          useValue: {
            get: jest.fn(),
            uploadStream: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VideoTranscoderService>(VideoTranscoderService);
    prismaMock = module.get(PrismaService) as jest.Mocked<PrismaService>;
    s3ServiceMock = module.get(S3Service) as jest.Mocked<S3Service>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("scheduleTranscodeVideo", () => {
    test("should add job to queue", async () => {
      const payload = { id: "vid-1", type: VideoType.MOVIE };
      await service.scheduleTranscodeVideo(payload);
      expect(queueMock.add).toHaveBeenCalledWith("transcode-video", payload, expect.any(Object));
    });
  });

  describe("cancelScheduledTranscodes", () => {
    test("should remove matched jobs", async () => {
      const job1 = {
        data: { id: "vid-1", type: VideoType.MOVIE },
        remove: jest.fn().mockResolvedValue(true),
      };
      const job2 = {
        data: { id: "vid-2", type: VideoType.MOVIE },
        remove: jest.fn().mockResolvedValue(true),
      };
      queueMock.getJobs.mockResolvedValue([job1, job2]);

      await service.cancelScheduledTranscodes("vid-1", VideoType.MOVIE);

      expect(queueMock.getJobs).toHaveBeenCalled();
      expect(job1.remove).toHaveBeenCalled();
      expect(job2.remove).not.toHaveBeenCalled();
    });
  });

  describe("updateStatus", () => {
    test("should update status for EPISODE", async () => {
      await service.updateStatus("ep-1", VideoType.EPISODE, "COMPLETED");
      expect(prismaMock.episode.updateMany).toHaveBeenCalledWith({
        where: { id: "ep-1" },
        data: { transcodingStatus: "COMPLETED" },
      });
      expect(prismaMock.title.updateMany).toHaveBeenCalled();
    });

    test("should update status for MOVIE", async () => {
      await service.updateStatus("mov-1", VideoType.MOVIE, "COMPLETED");
      expect(prismaMock.title.updateMany).toHaveBeenCalledWith({
        where: { id: "mov-1" },
        data: { transcodingStatus: "COMPLETED" },
      });
    });
  });

  describe("getProgress and updateProgress", () => {
    test("should get progress", async () => {
      const prog = { progressPercentage: 50 };
      (prismaMock.videoTranscodingProgress.findUnique as jest.Mock).mockResolvedValue(prog);

      const result = await service.getProgress("vid-1", VideoType.MOVIE);
      expect(prismaMock.videoTranscodingProgress.findUnique).toHaveBeenCalledWith({
        where: { titleId: "vid-1" },
      });
      expect(result).toEqual(prog);
    });

    test("should update progress if entity exists", async () => {
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue({ id: "vid-1" });
      await service.updateProgress("vid-1", VideoType.MOVIE, 80);
      expect(prismaMock.videoTranscodingProgress.upsert).toHaveBeenCalledWith({
        where: { titleId: "vid-1" },
        update: { progressPercentage: 80 },
        create: { titleId: "vid-1", progressPercentage: 80 },
      });
    });

    test("should not update progress if entity does not exist", async () => {
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue(null);
      await service.updateProgress("vid-1", VideoType.MOVIE, 80);
      expect(prismaMock.videoTranscodingProgress.upsert).not.toHaveBeenCalled();
    });
  });

  describe("transcodeVideo", () => {
    let mockDownloadStream: any;

    beforeEach(() => {
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue({ id: "vid-1" });

      mockDownloadStream = new Readable();
      mockDownloadStream._read = () => {};
      mockDownloadStream.pipe = jest.fn().mockReturnThis();
      mockDownloadStream.on = jest.fn().mockImplementation(function (
        this: any,
        event: string,
        cb: any,
      ) {
        if (event === "finish") setTimeout(cb, 0);
        return this;
      });

      s3ServiceMock.get.mockResolvedValue(mockDownloadStream as any);
      s3ServiceMock.uploadStream.mockResolvedValue(undefined as any);
    });

    test("should transcode movie successfully", async () => {
      await service.transcodeVideo("vid-1", "input.mp4", "out", VideoType.MOVIE);

      expect(prismaMock.title.findUnique).toHaveBeenCalled();
      expect(s3ServiceMock.get).toHaveBeenCalledWith("vid-1", BucketType.RAW);
      expect(ffmpeg).toHaveBeenCalledWith("input.mp4");

      // uploads 2 files (m3u8, ts), ignores folder
      expect(s3ServiceMock.uploadStream).toHaveBeenCalledTimes(2);
    });

    test("should transcode episode successfully", async () => {
      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue({
        id: "ep-1",
        seasonId: "s-1",
        season: { titleId: "t-1" },
      });

      await service.transcodeVideo("ep-1", "input.mp4", "out", VideoType.EPISODE);

      expect(s3ServiceMock.get).toHaveBeenCalledWith("ep-1", BucketType.RAW);
      expect(s3ServiceMock.uploadStream).toHaveBeenCalledTimes(2);
    });

    test("should throw TranscodeAbortedError if entity deleted before download", async () => {
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.transcodeVideo("vid-1", "input.mp4", "out", VideoType.MOVIE),
      ).rejects.toThrow(TranscodeAbortedError);
    });

    test("should throw BadRequestException if episode without relation found in uploadPath", async () => {
      (prismaMock.episode.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "ep-1" }) // first check entityExists
        .mockResolvedValueOnce(null); // inside uploadPath

      await expect(
        service.transcodeVideo("ep-1", "input.mp4", "out", VideoType.EPISODE),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
