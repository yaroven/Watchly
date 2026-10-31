import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ImageService } from "../image/image.service";
import { VideoType } from "../queues/video-transcoder/enums/video-type.enum";
import { VideoTranscodeScheduler } from "../queues/video-transcoder/video-transcode-scheduler.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { MediaAssetService } from "./media-asset.service";

describe("MediaAssetService", () => {
  let service: MediaAssetService;
  let s3ServiceMock: jest.Mocked<S3Service>;
  let schedulerMock: jest.Mocked<VideoTranscodeScheduler>;
  let imageServiceMock: jest.Mocked<ImageService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaAssetService,
        {
          provide: S3Service,
          useValue: {
            startMultipartUpload: jest.fn(),
            completeMultipartUpload: jest.fn(),
            abortMultipartUpload: jest.fn(),
            getReadPresignedUrl: jest.fn(),
            objectExists: jest.fn(),
            deleteObject: jest.fn(),
            deleteFolder: jest.fn(),
          },
        },
        {
          provide: VideoTranscodeScheduler,
          useValue: {
            schedule: jest.fn(),
            cancelScheduled: jest.fn(),
          },
        },
        { provide: ImageService, useValue: { deleteStoredImage: jest.fn() } },
      ],
    }).compile();

    service = module.get<MediaAssetService>(MediaAssetService);
    s3ServiceMock = module.get(S3Service) as jest.Mocked<S3Service>;
    schedulerMock = module.get(VideoTranscodeScheduler) as jest.Mocked<VideoTranscodeScheduler>;
    imageServiceMock = module.get(ImageService) as jest.Mocked<ImageService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("startUpload", () => {
    describe("should delegate to S3Service", () => {
      it("always", async () => {
        const startResponse = { uploadId: "upload-1", partSize: 8, parts: [] };
        (s3ServiceMock.startMultipartUpload as jest.Mock).mockResolvedValue(startResponse);

        const result = await service.startUpload("asset-1", 1000, VideoType.MOVIE);

        expect(s3ServiceMock.startMultipartUpload).toHaveBeenCalledWith(
          "title-video/asset-1",
          BucketType.RAW,
          1000,
        );
        expect(result).toEqual(startResponse);
      });
    });
  });

  describe("completeUpload", () => {
    describe("should delegate to S3Service", () => {
      it("always", async () => {
        const parts = [{ partNumber: 1, eTag: "etag-1" }];

        await service.completeUpload("asset-1", "upload-1", parts, VideoType.MOVIE);

        expect(s3ServiceMock.completeMultipartUpload).toHaveBeenCalledWith(
          "title-video/asset-1",
          BucketType.RAW,
          "upload-1",
          parts,
        );
      });
    });

    describe("should schedule the transcode", () => {
      it("always", async () => {
        await service.completeUpload("asset-1", "upload-1", [], VideoType.EPISODE);

        expect(schedulerMock.schedule).toHaveBeenCalledWith({
          id: "asset-1",
          type: VideoType.EPISODE,
          rawKey: "episode-video/asset-1",
        });
      });
    });

    it("should schedule the very key it uploaded to", async () => {
      await service.completeUpload("asset-1", "upload-1", [], VideoType.MOVIE);

      const [writtenKey] = s3ServiceMock.completeMultipartUpload.mock.calls[0];
      expect(schedulerMock.schedule).toHaveBeenCalledWith(
        expect.objectContaining({ rawKey: writtenKey }),
      );
    });
  });

  describe("abortUpload", () => {
    describe("should delegate to S3Service", () => {
      it("always", async () => {
        await service.abortUpload("asset-1", "upload-1", VideoType.EPISODE);

        expect(s3ServiceMock.abortMultipartUpload).toHaveBeenCalledWith(
          "episode-video/asset-1",
          BucketType.RAW,
          "upload-1",
        );
      });
    });
  });

  describe("getPlaybackUrl", () => {
    const MOVIE = { type: VideoType.MOVIE, titleId: "title-1" } as const;
    const EPISODE = {
      type: VideoType.EPISODE,
      titleId: "title-1",
      seasonId: "season-1",
      episodeId: "episode-1",
    } as const;

    it("returns a presigned url for the movie's manifest", async () => {
      s3ServiceMock.objectExists.mockResolvedValue(true);
      s3ServiceMock.getReadPresignedUrl.mockResolvedValue("read-url");

      const result = await service.getPlaybackUrl(MOVIE);

      expect(s3ServiceMock.getReadPresignedUrl).toHaveBeenCalledWith(
        "videos/title-1/master.m3u8",
        BucketType.PROCESSED,
      );
      expect(result).toEqual({ url: "read-url" });
    });

    it("builds the nested key for an episode", async () => {
      s3ServiceMock.objectExists.mockResolvedValue(true);
      s3ServiceMock.getReadPresignedUrl.mockResolvedValue("read-url");

      await service.getPlaybackUrl(EPISODE);

      expect(s3ServiceMock.getReadPresignedUrl).toHaveBeenCalledWith(
        "videos/title-1/season-1/episode-1/master.m3u8",
        BucketType.PROCESSED,
      );
    });

    it("answers 404 when the manifest is not there", async () => {
      s3ServiceMock.objectExists.mockResolvedValue(false);

      await expect(service.getPlaybackUrl(MOVIE)).rejects.toThrow(NotFoundException);
    });

    it("does not presign a key it could not confirm", async () => {
      s3ServiceMock.objectExists.mockResolvedValue(false);

      await expect(service.getPlaybackUrl(MOVIE)).rejects.toThrow(NotFoundException);
      expect(s3ServiceMock.getReadPresignedUrl).not.toHaveBeenCalled();
    });

    it("lets a stat failure surface instead of reading as absent", async () => {
      s3ServiceMock.objectExists.mockRejectedValue(new Error("network down"));

      await expect(service.getPlaybackUrl(MOVIE)).rejects.toThrow("network down");
    });
  });

  describe("scheduleTranscode", () => {
    it("should schedule the key the upload wrote", async () => {
      s3ServiceMock.objectExists.mockResolvedValue(true);

      await service.scheduleTranscode("ep-1", VideoType.EPISODE);

      expect(schedulerMock.schedule).toHaveBeenCalledWith({
        id: "ep-1",
        type: VideoType.EPISODE,
        rawKey: "episode-video/ep-1",
      });
    });

    it("should schedule the bare id for an upload that predates the key scheme", async () => {
      s3ServiceMock.objectExists.mockImplementation((key) => Promise.resolve(key === "ep-1"));

      await service.scheduleTranscode("ep-1", VideoType.EPISODE);

      expect(schedulerMock.schedule).toHaveBeenCalledWith(
        expect.objectContaining({ rawKey: "ep-1" }),
      );
    });
  });

  describe("cleanup", () => {
    let stored: Set<string>;

    const keysIn = (bucket: BucketType) =>
      [...stored]
        .filter((key) => key.startsWith(`${bucket}:`))
        .map((key) => key.slice(bucket.length + 1));

    beforeEach(() => {
      stored = new Set(
        [
          [BucketType.RAW, "title-video/t-1"],
          [BucketType.RAW, "t-1"],
          [BucketType.RAW, "episode-video/ep-1"],
          [BucketType.RAW, "episode-video/ep-2"],
          [BucketType.RAW, "episode-video/ep-other"],
          [BucketType.PROCESSED, "videos/t-1/master.m3u8"],
          [BucketType.PROCESSED, "videos/t-1/s-1/ep-1/master.m3u8"],
          [BucketType.PROCESSED, "videos/t-1/s-2/ep-2/master.m3u8"],
          [BucketType.PROCESSED, "videos/t-other/master.m3u8"],
        ].map(([bucket, key]) => `${bucket}:${key}`),
      );
      s3ServiceMock.deleteObject.mockImplementation((key, bucket) => {
        stored.delete(`${bucket}:${key}`);
        return Promise.resolve();
      });
      s3ServiceMock.deleteFolder.mockImplementation((prefix, bucket) => {
        for (const key of [...stored]) {
          if (key.startsWith(`${bucket}:${prefix}`)) stored.delete(key);
        }
        return Promise.resolve(0);
      });
      schedulerMock.cancelScheduled.mockResolvedValue(undefined);
    });

    it("should leave nothing of a title, its seasons or their episodes", async () => {
      await service.cleanupTitle({
        id: "t-1",
        posterKey: "posters/titles/t-1/v1.webp",
        seasons: [
          { id: "s-1", posterKey: "posters/seasons/s-1/v1.webp", episodes: [{ id: "ep-1" }] },
          { id: "s-2", posterKey: null, episodes: [{ id: "ep-2" }] },
        ],
      });

      expect(keysIn(BucketType.RAW)).toEqual(["episode-video/ep-other"]);
      expect(keysIn(BucketType.PROCESSED)).toEqual(["videos/t-other/master.m3u8"]);
      expect(imageServiceMock.deleteStoredImage).toHaveBeenCalledWith("posters/titles/t-1/v1.webp");
      expect(imageServiceMock.deleteStoredImage).toHaveBeenCalledWith(
        "posters/seasons/s-1/v1.webp",
      );
      expect(schedulerMock.cancelScheduled).toHaveBeenCalledWith("ep-2", VideoType.EPISODE);
    });

    it("should leave nothing of a season and keep its siblings", async () => {
      await service.cleanupSeason({
        id: "s-1",
        titleId: "t-1",
        posterKey: "posters/seasons/s-1/v1.webp",
        episodes: [{ id: "ep-1" }],
      });

      expect(keysIn(BucketType.RAW)).not.toContain("episode-video/ep-1");
      expect(keysIn(BucketType.RAW)).toContain("episode-video/ep-2");
      expect(keysIn(BucketType.PROCESSED)).not.toContain("videos/t-1/s-1/ep-1/master.m3u8");
      expect(keysIn(BucketType.PROCESSED)).toContain("videos/t-1/s-2/ep-2/master.m3u8");
      expect(imageServiceMock.deleteStoredImage).toHaveBeenCalledWith(
        "posters/seasons/s-1/v1.webp",
      );
    });

    it("should leave nothing of an episode and keep the rest of its season", async () => {
      await service.cleanupEpisode({ id: "ep-1", seasonId: "s-1", titleId: "t-1" });

      expect(keysIn(BucketType.RAW)).not.toContain("episode-video/ep-1");
      expect(keysIn(BucketType.PROCESSED)).toEqual([
        "videos/t-1/master.m3u8",
        "videos/t-1/s-2/ep-2/master.m3u8",
        "videos/t-other/master.m3u8",
      ]);
      expect(schedulerMock.cancelScheduled).toHaveBeenCalledWith("ep-1", VideoType.EPISODE);
    });

    it("should carry on past a failed delete", async () => {
      s3ServiceMock.deleteObject.mockRejectedValue(new Error("boom"));

      await expect(
        service.cleanupEpisode({ id: "ep-1", seasonId: "s-1", titleId: "t-1" }),
      ).resolves.toBeUndefined();
      expect(keysIn(BucketType.PROCESSED)).not.toContain("videos/t-1/s-1/ep-1/master.m3u8");
    });
  });
});
