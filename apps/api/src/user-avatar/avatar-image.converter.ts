import { Injectable, Logger } from "@nestjs/common";
import ffmpeg from "fluent-ffmpeg";
import { AVATAR_SIZE_PX, AVATAR_WEBP_QUALITY } from "./avatar-image.const";

/**
 * Converts an uploaded image to a square webp.
 *
 * ffmpeg rather than sharp: the worker image already installs ffmpeg for the
 * video pipeline and `fluent-ffmpeg` is already a dependency, so this adds no
 * native module and nothing to the alpine/musl build. sharp would give a nicer
 * resize API and little else at 256px.
 */
@Injectable()
export class AvatarImageConverter {
  private readonly logger = new Logger(AvatarImageConverter.name);

  async toSquareWebp(inputPath: string, outputPath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        // Scale so the short side reaches the target, then crop the centre:
        // letterboxing an avatar looks like a bug, and stretching looks worse.
        .videoFilters([
          `scale=${AVATAR_SIZE_PX}:${AVATAR_SIZE_PX}:force_original_aspect_ratio=increase`,
          `crop=${AVATAR_SIZE_PX}:${AVATAR_SIZE_PX}`,
        ])
        // One frame: an animated gif or a multi-page source would otherwise
        // produce an animated webp many times the size.
        .frames(1)
        .outputOptions([
          "-c:v",
          "libwebp",
          "-quality",
          String(AVATAR_WEBP_QUALITY),
          "-preset",
          "picture",
        ])
        .on("start", (cmd) => this.logger.debug(`ffmpeg: ${cmd}`))
        .on("error", (error: Error) => reject(error))
        .on("end", () => resolve())
        .save(outputPath);
    });
  }

  /** Rejects anything ffprobe cannot read as an image, before we spend a conversion on it. */
  async assertDecodableImage(inputPath: string): Promise<void> {
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
}
