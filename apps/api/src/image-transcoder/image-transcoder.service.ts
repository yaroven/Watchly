import { Injectable, Logger } from "@nestjs/common";
import ffmpeg from "fluent-ffmpeg";
import { stat } from "node:fs/promises";
import { ImageProfile } from "./image-profile.const";

@Injectable()
export class ImageTranscoderService {
  private readonly logger = new Logger(ImageTranscoderService.name);

  async convert(inputPath: string, outputPath: string, profile: ImageProfile): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters([
          `scale=${profile.width}:${profile.height}:force_original_aspect_ratio=increase`,
          `crop=${profile.width}:${profile.height}`,
        ])
        .frames(1)
        .outputOptions([
          "-c:v",
          `lib${profile.format}`,
          "-quality",
          String(profile.quality),
          "-preset",
          "picture",
        ])
        .on("start", (cmd) => this.logger.debug(`ffmpeg: ${cmd}`))
        .on("error", (error: Error) => reject(error))
        .on("end", () => resolve())
        .save(outputPath);
    });
  }

  async assertDecodable(inputPath: string): Promise<void> {
    const data = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (error: Error | null, metadata) =>
        error ? reject(error) : resolve(metadata),
      );
    });

    const hasImageStream = data.streams.some(
      (stream) => stream.codec_type === "video" && (stream.width ?? 0) > 0,
    );
    if (!hasImageStream) throw new Error("Uploaded file is not a decodable image");
  }

  async assertWithinSizeLimit(
    filePath: string,
    rawKey: string,
    profile: ImageProfile,
  ): Promise<void> {
    const { size } = await stat(filePath);
    if (size > profile.maxUploadBytes) {
      throw new Error(`${rawKey} is ${size} bytes, over the ${profile.maxUploadBytes} limit`);
    }
  }
}
