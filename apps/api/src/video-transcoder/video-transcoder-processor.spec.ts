import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TranscodingStatus } from "@prisma/client";
import { Job } from "bullmq";
import * as fs from "fs-extra";
import { mkdtemp, rm } from "node:fs/promises";
import * as path from "path";
import { register } from "prom-client";
import { Readable } from "stream";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { TranscodeVideoDto } from "./dto/request/transcode-video.dto";
import { VideoType } from "./enums/video-type.enum";
import { HlsTranscoder } from "./hls-transcoder.service";
import { TranscodeAbortedError } from "./utils/transcode-aborted.error";
import { VideoTranscodeStateService } from "./video-transcode-state.service";
import { VideoTranscoderProcessor } from "./video-transcoder-processor";

jest.mock("node:fs/promises");

jest.mock("fs-extra", () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  createWriteStream: jest.fn().mockReturnValue({
    on: jest.fn().mockImplementation(function (this: unknown, event: string, handler: () => void) {
      if (event === "finish") setTimeout(handler, 0);
      return this;
    }),
  }),
  createReadStream: jest.fn().mockReturnValue("mock-read-stream"),
  readdir: jest.fn().mockResolvedValue(["file1.m3u8", "file2.ts", "folder"]),
  // basename, not a substring: the macOS temp dir is /var/folders/..., so
  // `includes("folder")` would call every produced file a directory.
  stat: jest
    .fn()
    .mockImplementation((p: string) =>
      Promise.resolve({ isDirectory: () => path.basename(p) === "folder" }),
    ),
}));

/**
 * The processor owns the order of the stages now, so this spec drives the whole
 * pipeline with its collaborators mocked: `HlsTranscoder.run` is the seam that
 * used to be `VideoTranscoderService.transcodeVideo`.
 */
describe("VideoTranscoderProcessor", () => {
  let processor: VideoTranscoderProcessor;
  let hlsMock: { run: jest.Mock; probeWidth: jest.Mock };
  let stateMock: {
    exists: jest.Mock;
    ensureExists: jest.Mock;
    updateStatus: jest.Mock;
    updateProgress: jest.Mock;
  };
  let s3Mock: { get: jest.Mock; uploadStream: jest.Mock };
  let prismaMock: { episode: { findUnique: jest.Mock } };

  const mockJob = (data: TranscodeVideoDto): Job<TranscodeVideoDto> =>
    ({ id: "job-123", data }) as unknown as Job<TranscodeVideoDto>;

  const downloadStream = () => {
    const stream = new Readable() as Readable & { pipe: jest.Mock; on: jest.Mock };
    stream._read = () => undefined;
    stream.pipe = jest.fn().mockReturnThis();
    stream.on = jest.fn().mockImplementation(function (this: unknown) {
      return this;
    });
    return stream;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // Metrics are module-level on the default registry, so values survive from
    // one test to the next unless they are cleared. Registrations stay.
    register.resetMetrics();
    (mkdtemp as jest.Mock).mockImplementation((prefix: string) => Promise.resolve(`${prefix}XXXX`));
    (rm as jest.Mock).mockResolvedValue(undefined);

    hlsMock = {
      run: jest.fn().mockResolvedValue(undefined),
      probeWidth: jest.fn().mockResolvedValue(1920),
    };
    stateMock = {
      exists: jest.fn().mockResolvedValue(true),
      ensureExists: jest.fn().mockResolvedValue(undefined),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      updateProgress: jest.fn().mockResolvedValue(undefined),
    };
    s3Mock = {
      get: jest.fn().mockResolvedValue(downloadStream()),
      uploadStream: jest.fn().mockResolvedValue(undefined),
    };
    prismaMock = {
      episode: {
        findUnique: jest.fn().mockResolvedValue({
          id: "ep-1",
          seasonId: "s-1",
          season: { titleId: "t-1" },
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoTranscoderProcessor,
        { provide: HlsTranscoder, useValue: hlsMock },
        { provide: VideoTranscodeStateService, useValue: stateMock },
        { provide: S3Service, useValue: s3Mock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    processor = module.get(VideoTranscoderProcessor);
  });

  describe("status and progress", () => {
    it("marks PROCESSING and zero before starting", async () => {
      await processor.process(mockJob({ id: "ep-1", type: VideoType.EPISODE }));

      expect(stateMock.updateStatus).toHaveBeenCalledWith(
        "ep-1",
        VideoType.EPISODE,
        TranscodingStatus.PROCESSING,
      );
      expect(stateMock.updateProgress).toHaveBeenCalledWith("ep-1", VideoType.EPISODE, 0);
    });

    it("marks COMPLETED and a hundred on success", async () => {
      await processor.process(mockJob({ id: "ep-1", type: VideoType.EPISODE }));

      expect(stateMock.updateStatus).toHaveBeenCalledWith(
        "ep-1",
        VideoType.EPISODE,
        TranscodingStatus.COMPLETED,
      );
      expect(stateMock.updateProgress).toHaveBeenCalledWith("ep-1", VideoType.EPISODE, 100);
    });

    it("answers { result: 'success' }", async () => {
      const result = await processor.process(mockJob({ id: "ep-1", type: VideoType.EPISODE }));

      expect(result).toEqual({ result: "success" });
    });
  });

  describe("the pipeline", () => {
    it("creates the output directory before transcoding", async () => {
      await processor.process(mockJob({ id: "ep-1", type: VideoType.EPISODE }));

      expect(fs.ensureDir).toHaveBeenCalled();
    });

    it("downloads the raw object, probes it and uploads every produced file", async () => {
      await processor.process(mockJob({ id: "vid-1", type: VideoType.MOVIE }));

      expect(s3Mock.get).toHaveBeenCalledWith("vid-1", BucketType.RAW);
      expect(hlsMock.probeWidth).toHaveBeenCalled();
      expect(hlsMock.run).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceWidth: 1920,
          outputDir: expect.stringContaining("output"),
        }),
      );
      // Three entries, one of which is a directory.
      expect(s3Mock.uploadStream).toHaveBeenCalledTimes(2);
    });

    it("resolves an episode's path through its season and title", async () => {
      await processor.process(mockJob({ id: "ep-1", type: VideoType.EPISODE }));

      expect(prismaMock.episode.findUnique).toHaveBeenCalledWith({
        where: { id: "ep-1" },
        include: { season: true },
      });
      expect(s3Mock.uploadStream).toHaveBeenCalledTimes(2);
    });

    /**
     * The row is re-checked between stages, not once at the start: each stage
     * is long enough for the title or episode to be deleted while it runs.
     */
    it("re-checks the row between stages", async () => {
      await processor.process(mockJob({ id: "vid-1", type: VideoType.MOVIE }));

      expect(stateMock.ensureExists.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it("throws NotFoundException when an episode's season relation is missing", async () => {
      prismaMock.episode.findUnique.mockResolvedValue(null);

      await expect(
        processor.process(mockJob({ id: "ep-1", type: VideoType.EPISODE })),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("abort and failure", () => {
    it("answers { result: 'aborted' } without marking the job FAILED", async () => {
      hlsMock.run.mockRejectedValue(new TranscodeAbortedError("Job was cancelled"));

      const result = await processor.process(mockJob({ id: "ep-1", type: VideoType.EPISODE }));

      expect(result).toEqual({ result: "aborted" });
      expect(stateMock.updateStatus).not.toHaveBeenCalledWith(
        "ep-1",
        VideoType.EPISODE,
        TranscodingStatus.FAILED,
      );
    });

    it("marks FAILED and rethrows a real error", async () => {
      hlsMock.run.mockRejectedValue(new Error("ffmpeg error"));

      await expect(
        processor.process(mockJob({ id: "ep-1", type: VideoType.EPISODE })),
      ).rejects.toThrow("ffmpeg error");

      expect(stateMock.updateStatus).toHaveBeenCalledWith(
        "ep-1",
        VideoType.EPISODE,
        TranscodingStatus.FAILED,
      );
    });

    // A missing raw object is only an abort when the row is gone for both
    // kinds — the key alone does not say which it was.
    it("turns a failed download into an abort when the row is gone", async () => {
      s3Mock.get.mockRejectedValue(new Error("NoSuchKey"));
      stateMock.exists.mockResolvedValue(false);

      const result = await processor.process(mockJob({ id: "vid-1", type: VideoType.MOVIE }));

      expect(result).toEqual({ result: "aborted" });
    });

    it("rethrows a failed download when the row is still there", async () => {
      s3Mock.get.mockRejectedValue(new Error("NoSuchKey"));
      stateMock.exists.mockResolvedValue(true);

      await expect(
        processor.process(mockJob({ id: "vid-1", type: VideoType.MOVIE })),
      ).rejects.toThrow("NoSuchKey");
    });
  });

  describe("temp directory", () => {
    it("is cleaned up on success", async () => {
      await processor.process(mockJob({ id: "ep-1", type: VideoType.EPISODE }));

      expect(rm).toHaveBeenCalledWith(expect.stringContaining("transcode-job-123"), {
        recursive: true,
        force: true,
      });
    });

    it("is cleaned up on failure", async () => {
      hlsMock.run.mockRejectedValue(new Error("error"));

      await expect(
        processor.process(mockJob({ id: "ep-1", type: VideoType.EPISODE })),
      ).rejects.toThrow();

      expect(rm).toHaveBeenCalled();
    });

    it("is cleaned up on abort", async () => {
      hlsMock.run.mockRejectedValue(new TranscodeAbortedError("cancelled"));

      await processor.process(mockJob({ id: "ep-1", type: VideoType.EPISODE }));

      expect(rm).toHaveBeenCalled();
    });
  });

  describe("duration metric", () => {
    const sampleFor = async (outcome: string, kind = "episode") =>
      (await register.metrics()).includes(
        `video_transcode_duration_seconds_count{kind="${kind}",outcome="${outcome}"} 1`,
      );

    it("records a completed transcode as success, labelled by kind", async () => {
      await processor.process(mockJob({ id: "mv-1", type: VideoType.MOVIE }));

      await expect(sampleFor("success", "movie")).resolves.toBe(true);
    });

    /**
     * An abort means the title or episode was deleted mid-transcode. The job
     * returns rather than throwing, so BullMQ does not retry it — counting it
     * as failed would make a routine deletion look like a broken pipeline,
     * and the failure-ratio alert would fire on ordinary admin work.
     */
    it("separates an abort from a failure", async () => {
      hlsMock.run.mockRejectedValue(new TranscodeAbortedError("cancelled"));

      await processor.process(mockJob({ id: "ep-1", type: VideoType.EPISODE }));

      await expect(sampleFor("aborted")).resolves.toBe(true);
      await expect(sampleFor("failed")).resolves.toBe(false);
    });

    it("records a real error as failed", async () => {
      hlsMock.run.mockRejectedValue(new Error("ffmpeg died"));

      await expect(
        processor.process(mockJob({ id: "ep-1", type: VideoType.EPISODE })),
      ).rejects.toThrow();

      await expect(sampleFor("failed")).resolves.toBe(true);
      await expect(sampleFor("aborted")).resolves.toBe(false);
    });
  });
});
