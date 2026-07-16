import {
  BucketAlreadyExists,
  BucketAlreadyOwnedByYou,
  CreateBucketCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  NotFound,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sdkStreamMixin } from "@aws-sdk/util-stream-node";
import { InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { Readable } from "stream";
import { S3Config } from "../config/s3.config";
import BucketType from "./enums/bucket-type.enum";
import { S3Service } from "./s3.service";

jest.mock("@aws-sdk/lib-storage");
jest.mock("@aws-sdk/s3-request-presigner");
jest.mock("@aws-sdk/util-stream-node");

const mockSend = jest.fn();

const s3ConfigMock: S3Config = {
  region: "us-east-1",
  internalEndpoint: "http://localhost:9000",
  publicEndpoint: "https://cdn.example.com",
  accessKeyId: "test-access",
  secretAccessKey: "test-secret",
  rawBucketName: "watchly-raw",
  processedBucketName: "watchly-processed",
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
    test("should return rawBucketName for BucketType.RAW", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bucketName = (service as any).getBucketName(BucketType.RAW);
      expect(bucketName).toBe("watchly-raw");
    });

    test("should return processedBucketName for BucketType.PROCESSED", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bucketName = (service as any).getBucketName(BucketType.PROCESSED);
      expect(bucketName).toBe("watchly-processed");
    });
  });

  describe("mapSignedUrlToPublicEndpoint", () => {
    test("should replace protocol and hostname from internal to public endpoint", () => {
      const internalUrl = "http://localhost:9000/bucket/key?signature=abc";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).mapSignedUrlToPublicEndpoint(internalUrl);
      const parsed = new URL(result);
      expect(parsed.protocol).toBe("https:");
      expect(parsed.hostname).toBe("cdn.example.com");
    });
  });

  describe("get", () => {
    test("should return readable stream from S3", async () => {
      const mockBody = new Readable({ read() {} });
      mockSend.mockResolvedValueOnce({ Body: mockBody });

      const result = await service.get("my-key", BucketType.RAW);

      expect(mockSend).toHaveBeenCalledWith(expect.any(GetObjectCommand));
      expect(result).toBe(mockBody);
    });
  });

  describe("getFileBuffer", () => {
    test("should return buffer from S3 object", async () => {
      const mockBody = new Readable({ read() {} });
      mockSend.mockResolvedValueOnce({ Body: mockBody });

      const uint8 = new Uint8Array(Buffer.from("test data"));
      const mixedStream = new Readable({ read() {} });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sdkStreamMixin as jest.Mock).mockReturnValueOnce({
        transformToByteArray: jest.fn().mockResolvedValue(uint8),
      });

      const result = await service.getFileBuffer("my-key", BucketType.RAW);

      expect(sdkStreamMixin).toHaveBeenCalledWith(mockBody);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("uploadStream", () => {
    test("should upload stream using Upload", async () => {
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
    test("should return presigned URL with public endpoint mapping", async () => {
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

    test("should use default expiresIn of 3600 when not provided", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (getSignedUrl as jest.Mock).mockResolvedValueOnce("http://localhost:9000/bucket/key");

      await service.getUploadPresignedUrl("my-key" as any, BucketType.RAW);

      expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 3600,
      });
    });
  });

  describe("getReadPresignedUrl", () => {
    test("should return presigned URL with public endpoint mapping", async () => {
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

  describe("deleteObject", () => {
    test("should delete object and log success", async () => {
      mockSend.mockResolvedValueOnce({});

      await service.deleteObject("my-key", BucketType.RAW);

      expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    test("should rethrow on delete error", async () => {
      mockSend.mockRejectedValueOnce(new Error("delete failed"));

      await expect(service.deleteObject("my-key", BucketType.RAW)).rejects.toThrow("delete failed");
    });
  });

  describe("deleteFolder", () => {
    test("should list, delete objects in batches, and continue with continuation token", async () => {
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

    test("should handle folder with no objects", async () => {
      mockSend.mockResolvedValueOnce({ Contents: undefined });

      await service.deleteFolder("empty-folder/", BucketType.RAW);

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    test("should rethrow on list error", async () => {
      mockSend.mockRejectedValueOnce(new Error("list failed"));

      await expect(service.deleteFolder("folder", BucketType.RAW)).rejects.toThrow("list failed");
    });

    test("should append trailing slash if missing", async () => {
      mockSend.mockResolvedValueOnce({ Contents: [] });

      await service.deleteFolder("no-trailing", BucketType.RAW);

      const listCall = mockSend.mock.calls.find((call) => call[0] instanceof ListObjectsV2Command);
      expect(listCall[0].input.Prefix).toBe("no-trailing/");
    });
  });

  describe("onModuleInit", () => {
    const createHeadBucketMock = (error: Error | null) => {
      mockSend.mockImplementation((command) => {
        if (command instanceof HeadBucketCommand) {
          if (error) throw error;
          return Promise.resolve({});
        }
        if (command instanceof CreateBucketCommand) {
          return Promise.resolve({});
        }
        return Promise.resolve({});
      });
    };

    test("should verify existing bucket without creating", async () => {
      createHeadBucketMock(null);

      await service.onModuleInit();

      // Both buckets verified
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    test("should create bucket when NotFound is thrown", async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof HeadBucketCommand) {
          throw new NotFound({ message: "not found", $metadata: {} });
        }
        if (command instanceof CreateBucketCommand) {
          return Promise.resolve({});
        }
        return Promise.resolve({});
      });

      await service.onModuleInit();

      // 2 head-bucket failures + 2 create-bucket calls = 4
      expect(mockSend).toHaveBeenCalledTimes(4);
    });

    test("should rethrow non-NotFound errors from initializeBucket", async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof HeadBucketCommand) {
          throw new Error("unexpected error");
        }
        return Promise.resolve({});
      });

      await expect(service.onModuleInit()).rejects.toThrow(
        "An unexpected error occurred during S3 initialization",
      );
    });

    test("should retry initializeBucket up to 3 times when a non-NotFound error keeps occurring, then succeed", async () => {
      jest.useFakeTimers();
      let attempts = 0;
      mockSend.mockImplementation((command) => {
        if (command instanceof HeadBucketCommand) {
          attempts++;
          if (attempts % 3 !== 0) throw new Error("transient failure");
          return Promise.resolve({});
        }
        return Promise.resolve({});
      });

      const initPromise = service.onModuleInit();
      await jest.runAllTimersAsync();
      await initPromise;

      // 2 buckets × 3 attempts each (2 failures + 1 success per bucket)
      expect(attempts).toBe(6);
      jest.useRealTimers();
    });

    test("should throw after exhausting all retries when errors persist", async () => {
      jest.useFakeTimers();
      mockSend.mockImplementation((command) => {
        if (command instanceof HeadBucketCommand) {
          throw new Error("permanent failure");
        }
        return Promise.resolve({});
      });

      const initPromise = service.onModuleInit();
      const assertion = expect(initPromise).rejects.toThrow(InternalServerErrorException);
      await jest.runAllTimersAsync();
      await assertion;

      jest.useRealTimers();
    });
  });

  describe("createBucket", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let createBucketMethod: (bucketName: string) => Promise<void>;

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createBucketMethod = (service as any).createBucket.bind(service);
    });

    test("should create bucket successfully", async () => {
      mockSend.mockResolvedValueOnce({});

      await createBucketMethod("new-bucket");

      expect(mockSend).toHaveBeenCalledWith(expect.any(CreateBucketCommand));
    });

    test("should handle BucketAlreadyExists gracefully", async () => {
      mockSend.mockRejectedValueOnce(
        new BucketAlreadyExists({ message: "already exists", $metadata: {} }),
      );

      await expect(createBucketMethod("existing-bucket")).resolves.not.toThrow();
    });

    test("should handle BucketAlreadyOwnedByYou gracefully", async () => {
      mockSend.mockRejectedValueOnce(
        new BucketAlreadyOwnedByYou({ message: "already owned", $metadata: {} }),
      );

      await expect(createBucketMethod("owned-bucket")).resolves.not.toThrow();
    });

    test("should throw InternalServerErrorException for other errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("permission denied"));

      await expect(createBucketMethod("bad-bucket")).rejects.toThrow(InternalServerErrorException);
    });
  });
});
