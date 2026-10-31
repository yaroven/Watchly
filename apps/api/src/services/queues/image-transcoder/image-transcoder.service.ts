import { Injectable } from "@nestjs/common";
import { stat } from "node:fs/promises";
import { Logged } from "../../../decorators/logged.decorator";
import { FfmpegRunner } from "../../ffmpeg/ffmpeg.runner";
import { FfmpegJob } from "../../ffmpeg/ffmpeg.types";
import { ImageProfile } from "./image-profile.const";

@Injectable()
export class ImageTranscoderService {
  constructor(private readonly ffmpeg: FfmpegRunner) {}

  @Logged()
  async convert(inputPath: string, outputPath: string, profile: ImageProfile): Promise<void> {
    await this.ffmpeg.start(this.imageJob(inputPath, outputPath, profile), {
      onStart: (commandLine) => this.spawned(commandLine),
    }).done;
  }

  @Logged()
  async assertDecodable(inputPath: string): Promise<void> {
    const { streams } = await this.ffmpeg.probe(inputPath);

    const hasImageStream = streams.some(
      (stream) => stream.kind === "video" && (stream.width ?? 0) > 0,
    );
    if (!hasImageStream) throw new Error("Uploaded file is not a decodable image");
  }

  @Logged()
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

  @Logged({ completedLevel: "debug" })
  private spawned(commandLine: string): string {
    return commandLine;
  }

  private imageJob(input: string, output: string, profile: ImageProfile): FfmpegJob {
    return {
      input,
      output,
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
    };
  }
}
