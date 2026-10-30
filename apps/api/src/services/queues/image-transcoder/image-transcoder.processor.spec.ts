import { Test, TestingModule } from "@nestjs/testing";
import { Job } from "bullmq";
import { writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import BucketType from "../../s3/enums/bucket-type.enum";
import { S3Service } from "../../s3/s3.service";
import { ImageKind } from "./image-profile.const";
import { TranscodeImageJob } from "./image-transcode-queue.options";
import { ImageTranscoderProcessor } from "./image-transcoder.processor";
import { ImageTranscoderService } from "./image-transcoder.service";
import { IMAGE_ATTACHERS, ProcessedImageAttacher } from "./processed-image-attacher";

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
  let attacher: ProcessedImageAttacher & { attach: jest.Mock; buildKey: jest.Mock };

  const job = (overrides: Partial<Job<TranscodeImageJob>> = {}): Job<TranscodeImageJob> =>
    ({
      id: "job-1",
      data: { kind: ImageKind.USER_AVATAR, ownerId, rawKey },
      attemptsMade: 1,
      opts: { attempts: 3 },
      ...overrides,
    }) as unknown as Job<TranscodeImageJob>;

  const build = async (attachers: ProcessedImageAttacher[]) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageTranscoderProcessor,
        { provide: S3Service, useValue: s3Mock },
        { provide: ImageTranscoderService, useValue: transcoderMock },
        { provide: IMAGE_ATTACHERS, useValue: attachers },
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
    attacher = {
      kind: ImageKind.USER_AVATAR,
      buildKey: jest.fn((id: string, version: string) => `avatars/${id}/${version}.webp`),
      attach: jest.fn().mockResolvedValue(undefined),
    };

    processor = await build([attacher]);
  });

  afterEach(() => jest.clearAllMocks());

  it("should convert, upload under the attacher's key and attach it", async () => {
    const result = await processor.process(job());

    expect(transcoderMock.convert).toHaveBeenCalled();
    expect(s3Mock.uploadStream).toHaveBeenCalledWith(
      BucketType.PROCESSED,
      `avatars/${ownerId}/one.webp`,
      expect.anything(),
      "image/webp",
    );
    expect(attacher.attach).toHaveBeenCalledWith(ownerId, `avatars/${ownerId}/one.webp`);
    expect(result).toEqual({ key: `avatars/${ownerId}/one.webp` });
  });

  it("should refuse a kind that nobody registered", async () => {
    processor = await build([]);

    await expect(processor.process(job())).rejects.toThrow("No attacher registered");
    expect(transcoderMock.convert).not.toHaveBeenCalled();
    expect(s3Mock.uploadStream).not.toHaveBeenCalled();
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
    attacher.attach.mockRejectedValue(new Error("gone"));

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
