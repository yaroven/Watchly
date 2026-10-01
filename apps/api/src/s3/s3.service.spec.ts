import {
  CreateBucketCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NotFound,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { Readable } from "stream";
import { S3Config } from "../config/s3.config";
import BucketType from "./enums/bucket-type.enum";
import { S3Service } from "./s3.service";

jest.mock("@aws-sdk/lib-storage");
jest.mock("@aws-sdk/s3-request-presigner");

const mockSend = jest.fn();

const s3ConfigMock: S3Config = {
  region: "us-east-1",
  internalEndpoint: "http://localhost:9000",
  publicEndpoint: "https://cdn.example.com",
  accessKeyId: "test-access",
  secretAccessKey: "test-secret",
  rawBucketName: "watchly-raw",
  processedBucketName: "watchly-processed",
  eventsEnabled: true,
  queueName: "watchly-s3-events",
};

describe("S3Service", () => {
  let service: S3Service;
  let configServiceMock: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(s3ConfigMock),
          },
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    configServiceMock = module.get(ConfigService);

    // Override the real S3Client on the service instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).s3Client = { send: mockSend };
  });

  describe("getBucketName", () => {
    it("should return rawBucketName for BucketType.RAW", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bucketName = (service as any).getBucketName(BucketType.RAW);
      expect(bucketName).toBe("watchly-raw");
    });

    it("should return processedBucketName for BucketType.PROCESSED", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bucketName = (service as any).getBucketName(BucketType.PROCESSED);
      expect(bucketName).toBe("watchly-processed");
    });
  });

  describe("mapSignedUrlToPublicEndpoint", () => {
    it("should replace protocol and hostname from internal to public endpoint", () => {
      const internalUrl = "http://localhost:9000/bucket/key?signature=abc";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).mapSignedUrlToPublicEndpoint(internalUrl);
      const parsed = new URL(result);
      expect(parsed.protocol).toBe("https:");
      expect(parsed.hostname).toBe("cdn.example.com");
    });
  });

  describe("get", () => {
    it("should return readable stream from S3", async () => {
      const mockBody = new Readable({ read() {} });
      mockSend.mockResolvedValueOnce({ Body: mockBody });

      const result = await service.get("my-key", BucketType.RAW);

      expect(mockSend).toHaveBeenCalledWith(expect.any(GetObjectCommand));
      expect(result).toBe(mockBody);
    });
  });

  describe("uploadStream", () => {
    it("should upload stream using Upload", async () => {
      const mockStream = new Readable({ read() {} });
      const mockDone = { key: "uploaded-key" };
      (Upload as unknown as jest.Mock).mockImplementation(() => ({
        done: jest.fn().mockResolvedValue(mockDone),
      }));

      const result = await service.uploadStream(
        BucketType.PROCESSED,
        "key",
        mockStream,
        "video/mp4",
      );

      expect(Upload).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Bucket: "watchly-processed",
            Key: "key",
            ContentType: "video/mp4",
          }),
        }),
      );
      expect(result).toEqual(mockDone);
    });
  });

  describe("getUploadPresignedUrl", () => {
    it("should return presigned URL with public endpoint mapping", async () => {
      const signedUrl = "http://localhost:9000/bucket/key?signature=abc";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (getSignedUrl as jest.Mock).mockResolvedValueOnce(signedUrl);

      const result = await service.getUploadPresignedUrl("my-key", BucketType.RAW, 3600);

      expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.any(PutObjectCommand), {
        expiresIn: 3600,
      });
      const mapped = new URL(result);
      expect(mapped.hostname).toBe("cdn.example.com");
    });

    it("should use default expiresIn of 3600 when not provided", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (getSignedUrl as jest.Mock).mockResolvedValueOnce("http://localhost:9000/bucket/key");

      await service.getUploadPresignedUrl("my-key" as any, BucketType.RAW);

      expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 3600,
      });
    });
  });

  describe("getReadPresignedUrl", () => {
    it("should return presigned URL with public endpoint mapping", async () => {
      const signedUrl = "http://localhost:9000/bucket/key?signature=abc";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (getSignedUrl as jest.Mock).mockResolvedValueOnce(signedUrl);

      const result = await service.getReadPresignedUrl("my-key", BucketType.PROCESSED);

      expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.any(GetObjectCommand), {
        expiresIn: 3600,
      });
      const mapped = new URL(result);
      expect(mapped.hostname).toBe("cdn.example.com");
    });
  });

  describe("objectExists", () => {
    it("should report an object that is there", async () => {
      mockSend.mockResolvedValueOnce({});

      await expect(service.objectExists("my-key", BucketType.PROCESSED)).resolves.toBe(true);
      expect(mockSend).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
    });

    it("should report a missing object as absent rather than throwing", async () => {
      mockSend.mockRejectedValueOnce(new NotFound({ $metadata: {}, message: "nope" }));

      await expect(service.objectExists("my-key", BucketType.PROCESSED)).resolves.toBe(false);
    });

    // An outage is not an answer of "no". Swallowing it here would turn every
    // unreachable bucket into a 404 on media that exists.
    it("should rethrow anything that is not a 404", async () => {
      mockSend.mockRejectedValueOnce(new Error("network down"));

      await expect(service.objectExists("my-key", BucketType.PROCESSED)).rejects.toThrow(
        "network down",
      );
    });
  });

  describe("deleteObject", () => {
    it("should delete object and log success", async () => {
      mockSend.mockResolvedValueOnce({});

      await service.deleteObject("my-key", BucketType.RAW);

      expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it("should rethrow on delete error", async () => {
      mockSend.mockRejectedValueOnce(new Error("delete failed"));

      await expect(service.deleteObject("my-key", BucketType.RAW)).rejects.toThrow("delete failed");
    });
  });

  describe("deleteFolder", () => {
    it("should list, delete objects in batches, and continue with continuation token", async () => {
      const batch1 = [{ Key: "key1" }, { Key: "key2" }];
      const batch2 = [{ Key: "key3" }];
      mockSend
        .mockResolvedValueOnce({ Contents: batch1, NextContinuationToken: "token-abc" })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ Contents: batch2 })
        .mockResolvedValueOnce({});

      await service.deleteFolder("videos/title-1/", BucketType.PROCESSED);

      expect(mockSend).toHaveBeenCalledWith(expect.any(ListObjectsV2Command));
      expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectsCommand));
    });

    it("should handle folder with no objects", async () => {
      mockSend.mockResolvedValueOnce({ Contents: undefined });

      await service.deleteFolder("empty-folder/", BucketType.RAW);

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should rethrow on list error", async () => {
      mockSend.mockRejectedValueOnce(new Error("list failed"));

      await expect(service.deleteFolder("folder", BucketType.RAW)).rejects.toThrow("list failed");
    });

    it("should append trailing slash if missing", async () => {
      mockSend.mockResolvedValueOnce({ Contents: [] });

      await service.deleteFolder("no-trailing", BucketType.RAW);

      const listCall = mockSend.mock.calls.find((call) => call[0] instanceof ListObjectsV2Command);
      expect(listCall[0].input.Prefix).toBe("no-trailing/");
    });
  });

  describe("onModuleInit", () => {
    describe("should verify both buckets", () => {
      it("if they exist", async () => {
        mockSend.mockResolvedValue({});

        await service.onModuleInit();

        const heads = mockSend.mock.calls.filter(([c]) => c instanceof HeadBucketCommand);
        expect(heads).toHaveLength(2);
      });
    });

    describe("should throw naming the bucket", () => {
      it("if one is missing, since provisioning belongs to the environment", async () => {
        mockSend.mockImplementation((command) => {
          if (command instanceof HeadBucketCommand) {
            throw new NotFound({ message: "not found", $metadata: {} });
          }
          return Promise.resolve({});
        });

        await expect(service.onModuleInit()).rejects.toThrow("watchly-raw");
      });
    });

    describe("should not create anything", () => {
      it("even when a bucket is missing", async () => {
        mockSend.mockImplementation((command) => {
          if (command instanceof HeadBucketCommand) {
            throw new NotFound({ message: "not found", $metadata: {} });
          }
          return Promise.resolve({});
        });

        await expect(service.onModuleInit()).rejects.toThrow();

        const creates = mockSend.mock.calls.filter(([c]) => c instanceof CreateBucketCommand);
        expect(creates).toHaveLength(0);
      });
    });
  });
});
