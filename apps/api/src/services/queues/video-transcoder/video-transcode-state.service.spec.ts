import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { VideoType } from "./enums/video-type.enum";
import { TranscodeAbortedError } from "./utils/transcode-aborted.error";
import { VideoTranscodeStateService } from "./video-transcode-state.service";

describe("VideoTranscodeStateService", () => {
  let state: VideoTranscodeStateService;
  let prismaMock: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoTranscodeStateService,
        {
          provide: PrismaService,
          useValue: {
            episode: { findUnique: jest.fn(), updateMany: jest.fn() },
            title: { findUnique: jest.fn(), updateMany: jest.fn() },
            videoTranscodingProgress: { upsert: jest.fn(), findUnique: jest.fn() },
            $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
          },
        },
      ],
    }).compile();

    state = module.get(VideoTranscodeStateService);
    prismaMock = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => jest.clearAllMocks());

  describe("exists / ensureExists", () => {
    it("reads the episode table for an episode", async () => {
      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue({ id: "ep-1" });

      await expect(state.exists("ep-1", VideoType.EPISODE)).resolves.toBe(true);
      expect(prismaMock.title.findUnique).not.toHaveBeenCalled();
    });

    it("reads the title table for a movie", async () => {
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue({ id: "mv-1" });

      await expect(state.exists("mv-1", VideoType.MOVIE)).resolves.toBe(true);
      expect(prismaMock.episode.findUnique).not.toHaveBeenCalled();
    });

    // A deleted row mid-job is an abort, not a failure — the distinction the
    // processor relies on to avoid marking routine deletions as failed.
    it("throws TranscodeAbortedError when the row is gone", async () => {
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(state.ensureExists("mv-1", VideoType.MOVIE)).rejects.toThrow(
        TranscodeAbortedError,
      );
    });
  });

  describe("updateStatus", () => {
    it("updates both the episode and its title, in one transaction", async () => {
      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue({
        season: { titleId: "title-1" },
      });

      await state.updateStatus("ep-1", VideoType.EPISODE, "COMPLETED");

      expect(prismaMock.episode.updateMany).toHaveBeenCalledWith({
        where: { id: "ep-1" },
        data: { transcodingStatus: "COMPLETED" },
      });
      expect(prismaMock.title.updateMany).toHaveBeenCalledWith({
        where: { id: "title-1" },
        data: { transcodingStatus: "COMPLETED" },
      });
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it("does nothing when the episode no longer exists", async () => {
      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);

      await state.updateStatus("ep-1", VideoType.EPISODE, "COMPLETED");

      expect(prismaMock.episode.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.title.updateMany).not.toHaveBeenCalled();
    });

    it("updates only the title for a movie", async () => {
      await state.updateStatus("mov-1", VideoType.MOVIE, "COMPLETED");

      expect(prismaMock.title.updateMany).toHaveBeenCalledWith({
        where: { id: "mov-1" },
        data: { transcodingStatus: "COMPLETED" },
      });
    });
  });

  describe("getProgress", () => {
    it("reads the row for the arc the type names", async () => {
      const prog = { progressPercentage: 50 };
      (prismaMock.videoTranscodingProgress.findUnique as jest.Mock).mockResolvedValue(prog);

      const result = await state.getProgress("vid-1", VideoType.MOVIE);

      expect(prismaMock.videoTranscodingProgress.findUnique).toHaveBeenCalledWith({
        where: { titleId: "vid-1" },
      });
      expect(result).toEqual(prog);
    });

    it("answers the view, not the row", async () => {
      (prismaMock.videoTranscodingProgress.findUnique as jest.Mock).mockResolvedValue({
        id: "progress-1",
        progressPercentage: 50,
        unrelatedColumn: "must not leak",
      });

      const result = await state.getProgress("vid-1", VideoType.MOVIE);

      expect(Object.keys(result!).sort()).toEqual([
        "createdAt",
        "episodeId",
        "id",
        "progressPercentage",
        "titleId",
        "updatedAt",
      ]);
    });

    it("answers null when nothing has been recorded", async () => {
      (prismaMock.videoTranscodingProgress.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(state.getProgress("vid-1", VideoType.MOVIE)).resolves.toBeNull();
    });
  });

  describe("updateProgress", () => {
    it("upserts the percentage when the entity exists", async () => {
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue({ id: "vid-1" });

      await state.updateProgress("vid-1", VideoType.MOVIE, 80);

      expect(prismaMock.videoTranscodingProgress.upsert).toHaveBeenCalledWith({
        where: { titleId: "vid-1" },
        update: { progressPercentage: 80 },
        create: { titleId: "vid-1", progressPercentage: 80 },
      });
    });

    // Writing progress for a deleted row would resurrect a FK-less orphan.
    it("writes nothing when the entity is gone", async () => {
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue(null);

      await state.updateProgress("vid-1", VideoType.MOVIE, 80);

      expect(prismaMock.videoTranscodingProgress.upsert).not.toHaveBeenCalled();
    });
  });
});
