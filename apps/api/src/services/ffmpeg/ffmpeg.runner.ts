import { Injectable } from "@nestjs/common";
import ffmpeg from "fluent-ffmpeg";
import { Logged } from "../../decorators/logged.decorator";
import { FfmpegHandle, FfmpegHooks, FfmpegJob, MediaInfo, MediaStreamKind } from "./ffmpeg.types";

const kindOf = (codecType: string | undefined): MediaStreamKind =>
  codecType === "video" || codecType === "audio" ? codecType : "other";

@Injectable()
export class FfmpegRunner {
  @Logged()
  start(job: FfmpegJob, { onStart, onProgress }: FfmpegHooks = {}): FfmpegHandle {
    const command = ffmpeg(job.input);

    if (job.format) command.format(job.format);
    if (job.videoFilters?.length) command.videoFilters(job.videoFilters);
    if (job.frames !== undefined) command.frames(job.frames);
    if (job.outputOptions.length) command.outputOptions(...job.outputOptions);

    const done = new Promise<void>((resolve, reject) => {
      command
        .output(job.output)
        .on("start", (commandLine: string) => onStart?.(commandLine))
        .on("progress", (progress: { percent?: number }) => onProgress?.(progress.percent))
        .on("end", () => resolve())
        .on("error", (error: Error) => reject(error))
        .run();
    });

    return { done, kill: () => command.kill("SIGKILL") };
  }

  @Logged()
  probe(filePath: string): Promise<MediaInfo> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (error: Error | null, data: ffmpeg.FfprobeData) => {
        if (error) return reject(error);

        resolve({
          streams: data.streams.map((stream) => ({
            kind: kindOf(stream.codec_type),
            width: stream.width,
            height: stream.height,
          })),
        });
      });
    });
  }
}
