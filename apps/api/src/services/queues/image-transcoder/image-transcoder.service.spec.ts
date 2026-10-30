import { stat } from "node:fs/promises";
import { FfmpegRunner } from "../../ffmpeg/ffmpeg.runner";
import { FfmpegJob, MediaStream } from "../../ffmpeg/ffmpeg.types";
import { ImageKind, imageProfile } from "./image-profile.const";
import { ImageTranscoderService } from "./image-transcoder.service";

jest.mock("node:fs/promises");

describe("ImageTranscoderService", () => {
  const profile = imageProfile(ImageKind.USER_AVATAR);

  let service: ImageTranscoderService;
  let runner: { start: jest.Mock; probe: jest.Mock };
  let done: Promise<void>;

  beforeEach(() => {
    done = Promise.resolve();
    runner = {
      start: jest.fn(() => ({ done, kill: jest.fn() })),
      probe: jest.fn(),
    };
    service = new ImageTranscoderService(runner as unknown as FfmpegRunner);
  });

  afterEach(() => jest.clearAllMocks());

  describe("convert", () => {
    it("scales to cover the profile's box, crops to it and keeps one frame", async () => {
      await service.convert("/work/in.png", "/work/out.webp", profile);

      const [job] = runner.start.mock.calls[0] as [FfmpegJob];
      expect(job).toEqual({
        input: "/work/in.png",
        output: "/work/out.webp",
        videoFilters: [
          `scale=${profile.width}:${profile.height}:force_original_aspect_ratio=increase`,
          `crop=${profile.width}:${profile.height}`,
        ],
        frames: 1,
        outputOptions: [
          "-c:v",
          `lib${profile.format}`,
          "-quality",
          String(profile.quality),
          "-preset",
          "picture",
        ],
      });
    });

    it("fails when ffmpeg fails", async () => {
      done = Promise.reject(new Error("Conversion failed!"));

      await expect(service.convert("/in", "/out", profile)).rejects.toThrow("Conversion failed!");
    });
  });

  describe("assertDecodable", () => {
    const streams = (...list: MediaStream[]) => runner.probe.mockResolvedValue({ streams: list });

    it("accepts a file with a video stream that has a width", async () => {
      streams({ kind: "video", width: 512, height: 512 });

      await expect(service.assertDecodable("/in")).resolves.toBeUndefined();
    });

    it("rejects a file with no picture in it", async () => {
      streams({ kind: "audio" });

      await expect(service.assertDecodable("/in")).rejects.toThrow("not a decodable image");
    });

    it("rejects a video stream with no width", async () => {
      streams({ kind: "video", width: 0 });

      await expect(service.assertDecodable("/in")).rejects.toThrow("not a decodable image");
    });
  });

  describe("assertWithinSizeLimit", () => {
    it("accepts a file at the limit", async () => {
      (stat as jest.Mock).mockResolvedValue({ size: profile.maxUploadBytes });

      await expect(
        service.assertWithinSizeLimit("/in", "raw/key", profile),
      ).resolves.toBeUndefined();
    });

    it("rejects a file one byte over it, naming the key", async () => {
      (stat as jest.Mock).mockResolvedValue({ size: profile.maxUploadBytes + 1 });

      await expect(service.assertWithinSizeLimit("/in", "raw/key", profile)).rejects.toThrow(
        "raw/key",
      );
    });
  });
});
