import { Test, TestingModule } from "@nestjs/testing";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";
import { MediaAssetService } from "./media-asset.service";

describe("MediaAssetService", () => {
  let service: MediaAssetService;
  let s3ServiceMock: jest.Mocked<S3Service>;
  let videoTranscoderServiceMock: jest.Mocked<VideoTranscoderService>;

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
            deleteObject: jest.fn(),
            deleteFolder: jest.fn(),
          },
        },
        {
          provide: VideoTranscoderService,
          useValue: {
            scheduleTranscodeVideo: jest.fn(),
            cancelScheduledTranscodes: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MediaAssetService>(MediaAssetService);
    s3ServiceMock = module.get(S3Service) as jest.Mocked<S3Service>;
    videoTranscoderServiceMock = module.get(
      VideoTranscoderService,
    ) as jest.Mocked<VideoTranscoderService>;
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

        const result = await service.startUpload("asset-1", 1000);

        expect(s3ServiceMock.startMultipartUpload).toHaveBeenCalledWith(
          "asset-1",
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

        await service.completeUpload("asset-1", "upload-1", parts);

        expect(s3ServiceMock.completeMultipartUpload).toHaveBeenCalledWith(
          "asset-1",
          BucketType.RAW,
          "upload-1",
          parts,
        );
      });
    });
  });

  describe("abortUpload", () => {
    describe("should delegate to S3Service", () => {
      it("always", async () => {
        await service.abortUpload("asset-1", "upload-1");

        expect(s3ServiceMock.abortMultipartUpload).toHaveBeenCalledWith(
          "asset-1",
          BucketType.RAW,
          "upload-1",
        );
      });
    });
  });

  describe("scheduleTranscode", () => {
    describe("should delegate to VideoTranscoderService", () => {
      it("always", async () => {
        await service.scheduleTranscode("asset-1", VideoType.EPISODE);

        expect(videoTranscoderServiceMock.scheduleTranscodeVideo).toHaveBeenCalledWith({
          id: "asset-1",
          type: VideoType.EPISODE,
        });
      });
    });
  });

  describe("getReadUrl", () => {
    describe("should return a presigned read url", () => {
      it("always", async () => {
        s3ServiceMock.getReadPresignedUrl.mockResolvedValue("read-url");

        const result = await service.getReadUrl("videos/asset-1/master.m3u8");

        expect(s3ServiceMock.getReadPresignedUrl).toHaveBeenCalledWith(
          "videos/asset-1/master.m3u8",
          BucketType.PROCESSED,
        );
        expect(result).toEqual({ url: "read-url" });
      });
    });
  });

  describe("deleteProcessedFolder", () => {
    describe("should delegate to S3Service", () => {
      it("always", async () => {
        (s3ServiceMock.deleteFolder as jest.Mock).mockResolvedValue(undefined);

        await service.deleteProcessedFolder("videos/title-1/season-1/");

        expect(s3ServiceMock.deleteFolder).toHaveBeenCalledWith(
          "videos/title-1/season-1/",
          BucketType.PROCESSED,
        );
      });
    });
  });

  describe("cleanupVideoAsset", () => {
    beforeEach(() => {
      videoTranscoderServiceMock.cancelScheduledTranscodes.mockResolvedValue(undefined as any);
      (s3ServiceMock.deleteObject as jest.Mock).mockResolvedValue(undefined);
      (s3ServiceMock.deleteFolder as jest.Mock).mockResolvedValue(undefined);
    });

    describe("should cancel the scheduled transcode and delete the raw video", () => {
      it("if no processed path is given", async () => {
        await service.cleanupVideoAsset("vid-1", VideoType.MOVIE);

        expect(videoTranscoderServiceMock.cancelScheduledTranscodes).toHaveBeenCalledWith(
          "vid-1",
          VideoType.MOVIE,
        );
        expect(s3ServiceMock.deleteObject).toHaveBeenCalledWith("vid-1", BucketType.RAW);
        expect(s3ServiceMock.deleteFolder).not.toHaveBeenCalled();
      });
    });

    describe("should also delete the processed folder", () => {
      it("if a processed path is given", async () => {
        await service.cleanupVideoAsset("ep-1", VideoType.EPISODE, "videos/title-1/season-1/ep-1/");

        expect(s3ServiceMock.deleteObject).toHaveBeenCalledWith("ep-1", BucketType.RAW);
        expect(s3ServiceMock.deleteFolder).toHaveBeenCalledWith(
          "videos/title-1/season-1/ep-1/",
          BucketType.PROCESSED,
        );
      });
    });

    describe("should log and swallow a failure instead of throwing", () => {
      it("if deleting the raw video fails", async () => {
        (s3ServiceMock.deleteObject as jest.Mock).mockRejectedValue(new Error("boom"));

        await expect(service.cleanupVideoAsset("vid-1", VideoType.MOVIE)).resolves.toBeUndefined();
      });
    });
  });
});
