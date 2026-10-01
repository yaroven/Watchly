import { getQueueToken } from "@nestjs/bullmq";
import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { AVATAR_QUEUE_NAME } from "./avatar-queue.options";
import { UserAvatarService } from "./user-avatar.service";

describe("UserAvatarService", () => {
  const userId = "44444444-4444-4444-8444-444444444444";

  let service: UserAvatarService;
  let s3Mock: { getUploadPresignedUrl: jest.Mock; deleteObject: jest.Mock };
  let prismaMock: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let queueMock: { add: jest.Mock };

  beforeEach(async () => {
    s3Mock = {
      getUploadPresignedUrl: jest.fn().mockResolvedValue("https://s3.test/put"),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };
    prismaMock = { user: { findUnique: jest.fn(), update: jest.fn() } };
    queueMock = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAvatarService,
        { provide: S3Service, useValue: s3Mock },
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: () => ({
              publicEndpoint: "http://localhost:4566",
              processedBucketName: "content",
            }),
          },
        },
        { provide: getQueueToken(AVATAR_QUEUE_NAME), useValue: queueMock },
      ],
    }).compile();

    service = module.get(UserAvatarService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("createUploadUrl", () => {
    it("should put the upload under the avatar prefix and the owner's id", async () => {
      const result = await service.createUploadUrl(userId, "image/png");

      const [key, bucket] = s3Mock.getUploadPresignedUrl.mock.calls[0] as [string, BucketType];
      expect(key.startsWith(`user-avatar/${userId}/`)).toBe(true);
      expect(bucket).toBe(BucketType.RAW);
      expect(result.rawKey).toBe(key);
    });

    // Two uploads racing must not land on one key: the second would overwrite
    // the first and both events would then process the same bytes.
    it("should use a fresh name per upload", async () => {
      const first = await service.createUploadUrl(userId, "image/png");
      const second = await service.createUploadUrl(userId, "image/png");

      expect(first.rawKey).not.toBe(second.rawKey);
    });

    it("should refuse a content type that is not an image we convert", async () => {
      await expect(service.createUploadUrl(userId, "application/pdf")).rejects.toThrow(
        BadRequestException,
      );
      expect(s3Mock.getUploadPresignedUrl).not.toHaveBeenCalled();
    });
  });

  describe("scheduleProcessing", () => {
    // A redelivered SQS message must not convert the same object twice.
    it("should key the job on the uploaded object", async () => {
      await service.scheduleProcessing({ userId, rawKey: "user-avatar/u/one" });

      expect(queueMock.add).toHaveBeenCalledWith(
        expect.any(String),
        { userId, rawKey: "user-avatar/u/one" },
        expect.objectContaining({ jobId: "avatar-user-avatar/u/one" }),
      );
    });
  });

  describe("attachProcessedAvatar", () => {
    it("should point the user at the new object and delete the one it replaces", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ avatarKey: "avatars/u/old.webp" });

      await service.attachProcessedAvatar(userId, "avatars/u/new.webp");

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { avatarKey: "avatars/u/new.webp" },
      });
      expect(s3Mock.deleteObject).toHaveBeenCalledWith("avatars/u/old.webp", BucketType.PROCESSED);
    });

    it("should not delete anything when there was no previous avatar", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ avatarKey: null });

      await service.attachProcessedAvatar(userId, "avatars/u/new.webp");

      expect(s3Mock.deleteObject).not.toHaveBeenCalled();
    });

    // Otherwise the object outlives the account that owned it.
    it("should discard the new object when the account is gone", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.attachProcessedAvatar(userId, "avatars/u/new.webp")).rejects.toThrow(
        BadRequestException,
      );
      expect(s3Mock.deleteObject).toHaveBeenCalledWith("avatars/u/new.webp", BucketType.PROCESSED);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("should clear the column and delete the object", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ avatarKey: "avatars/u/one.webp" });

      await service.remove(userId);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { avatarKey: null },
      });
      expect(s3Mock.deleteObject).toHaveBeenCalledWith("avatars/u/one.webp", BucketType.PROCESSED);
    });

    it("should do nothing when there is no avatar", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ avatarKey: null });

      await service.remove(userId);

      expect(prismaMock.user.update).not.toHaveBeenCalled();
      expect(s3Mock.deleteObject).not.toHaveBeenCalled();
    });
  });

  describe("buildPublicUrl", () => {
    // Unsigned on purpose: a signature expires while the row keeps claiming it works.
    it("should build an unsigned URL into the processed bucket", () => {
      expect(service.buildPublicUrl("avatars/u/one.webp")).toBe(
        "http://localhost:4566/content/avatars/u/one.webp",
      );
    });

    it("should stay null when the user has no avatar", () => {
      expect(service.buildPublicUrl(null)).toBeNull();
    });
  });
});
