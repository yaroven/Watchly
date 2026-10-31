import { Test, TestingModule } from "@nestjs/testing";
import { Job } from "bullmq";
import { writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { ImageKind } from "../../image/enums/image-kind.enum";
import { ImageService } from "../../image/image.service";
import BucketType from "../../s3/enums/bucket-type.enum";
import { S3Service } from "../../s3/s3.service";
import { TranscodeImageJob } from "./image-transcode-queue.options";
import { ImageTranscoderProcessor } from "./image-transcoder.processor";
import { ImageTranscoderService } from "./image-transcoder.service";

describe("ImageTranscoderProcessor", () => {
  const ownerId = "44444444-4444-4444-8444-444444444444";
  const rawKey = `user-avatar/${ownerId}/one`;

  let processor: ImageTranscoderProcessor;
  let s3Mock: { get: jest.Mock; uploadStream: jest.Mock; deleteObject: jest.Mock };
  let transcoderMock: {
    convert: jest.Mock;
    assertDecodable: jest.Mock;
    assertWithinSizeLimit: jest.Mock;
  };
  let images: { attachProcessed: jest.Mock; buildProcessedKey: jest.Mock };

  const job = (overrides: Partial<Job<TranscodeImageJob>> = {}): Job<TranscodeImageJob> =>
    ({
      id: "job-1",
      data: { kind: ImageKind.USER_AVATAR, ownerId, rawKey },
      attemptsMade: 1,
      opts: { attempts: 3 },
      ...overrides,
    }) as unknown as Job<TranscodeImageJob>;

  const build = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageTranscoderProcessor,
        { provide: S3Service, useValue: s3Mock },
        { provide: ImageTranscoderService, useValue: transcoderMock },
        { provide: ImageService, useValue: images },
      ],
    }).compile();

    return module.get(ImageTranscoderProcessor);
  };

  beforeEach(async () => {
    s3Mock = {
      get: jest.fn().mockResolvedValue(Readable.from(["bytes"])),
      uploadStream: jest.fn().mockResolvedValue(undefined),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };
    transcoderMock = {
      convert: jest.fn((_input: string, output: string) => writeFile(output, "converted")),
      assertDecodable: jest.fn().mockResolvedValue(undefined),
      assertWithinSizeLimit: jest.fn().mockResolvedValue(undefined),
    };
    images = {
      buildProcessedKey: jest.fn(
        (_kind: ImageKind, id: string, version: string) => `avatars/${id}/${version}.webp`,
      ),
      attachProcessed: jest.fn().mockResolvedValue(undefined),
    };

    processor = await build();
  });

  afterEach(() => jest.clearAllMocks());

  it("should convert, upload under the image module's key and attach it", async () => {
    const result = await processor.process(job());

    expect(transcoderMock.convert).toHaveBeenCalled();
    expect(s3Mock.uploadStream).toHaveBeenCalledWith(
      BucketType.PROCESSED,
      `avatars/${ownerId}/one.webp`,
      expect.anything(),
      "image/webp",
    );
    expect(images.buildProcessedKey).toHaveBeenCalledWith(ImageKind.USER_AVATAR, ownerId, "one");
    expect(images.attachProcessed).toHaveBeenCalledWith(
      ImageKind.USER_AVATAR,
      ownerId,
      `avatars/${ownerId}/one.webp`,
    );
    expect(result).toEqual({ key: `avatars/${ownerId}/one.webp` });
  });

  it("should delete the original once it has been processed", async () => {
    await processor.process(job());

    expect(s3Mock.deleteObject).toHaveBeenCalledWith(rawKey, BucketType.RAW);
  });

  it("should keep the original when a retry is still coming", async () => {
    transcoderMock.convert.mockRejectedValue(new Error("ffmpeg"));

    await expect(processor.process(job({ attemptsMade: 1 }))).rejects.toThrow("ffmpeg");
    expect(s3Mock.deleteObject).not.toHaveBeenCalled();
  });

  it("should delete the original once the last attempt has failed", async () => {
    transcoderMock.convert.mockRejectedValue(new Error("ffmpeg"));

    await expect(processor.process(job({ attemptsMade: 3 }))).rejects.toThrow("ffmpeg");
    expect(s3Mock.deleteObject).toHaveBeenCalledWith(rawKey, BucketType.RAW);
  });

  it("should delete an upload that was never attached when the last attempt fails", async () => {
    images.attachProcessed.mockRejectedValue(new Error("gone"));

    await expect(processor.process(job({ attemptsMade: 3 }))).rejects.toThrow("gone");
    expect(s3Mock.deleteObject).toHaveBeenCalledWith(
      `avatars/${ownerId}/one.webp`,
      BucketType.PROCESSED,
    );
  });

  it("should leave the processed bucket alone when the job failed before uploading", async () => {
    transcoderMock.assertDecodable.mockRejectedValue(new Error("not an image"));

    await expect(processor.process(job({ attemptsMade: 3 }))).rejects.toThrow("not an image");
    expect(s3Mock.deleteObject).not.toHaveBeenCalledWith(expect.anything(), BucketType.PROCESSED);
  });

  it("should reject an original larger than the profile allows", async () => {
    transcoderMock.assertWithinSizeLimit.mockRejectedValue(new Error("over the limit"));

    await expect(processor.process(job())).rejects.toThrow("over the limit");
    expect(transcoderMock.convert).not.toHaveBeenCalled();
  });
});
