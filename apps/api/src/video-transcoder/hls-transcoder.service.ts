import { Injectable, Logger } from "@nestjs/common";
import ffmpeg from "fluent-ffmpeg";
import * as path from "path";
import { TranscodeAbortedError } from "./utils/transcode-aborted.error";
import { HLS_SEGMENT_SECONDS, PROGRESS_INTERVAL_MS, VIDEO_VARIANTS } from "./video-profile.const";

export interface HlsTranscodeRequest {
  input: string;
  outputDir: string;
  sourceWidth: number;
  onProgress: (percent: number) => void;
  shouldAbort: () => Promise<boolean>;
}

@Injectable()
export class HlsTranscoder {
  private readonly logger = new Logger(HlsTranscoder.name);

  async probeWidth(filePath: string): Promise<number> {
    const metadata = await this.metadata(filePath);
    const videoStream = metadata.streams.find((stream) => stream.codec_type === "video");

    return videoStream?.width || 0;
  }

  async run({
    input,
    outputDir,
    sourceWidth,
    onProgress,
    shouldAbort,
  }: HlsTranscodeRequest): Promise<void> {
    let lastProgressUpdate = 0;

    return new Promise((resolve, reject) => {
      const command = ffmpeg(input);

      const activeVariants = VIDEO_VARIANTS.filter((variant) => variant.width <= sourceWidth);
      const variants =
        activeVariants.length > 0 ? activeVariants : [VIDEO_VARIANTS[VIDEO_VARIANTS.length - 1]];

      command
        .format("hls")
        .addOption("-hls_time", String(HLS_SEGMENT_SECONDS))
        .addOption("-hls_playlist_type", "vod")
        .addOption("-master_pl_name", "master.m3u8");

      const streamMap: string[] = [];
      variants.forEach((variant, index) => {
        this.addVariant(command, index, `${variant.width}x${variant.height}`, variant.bitrate);
        streamMap.push(`v:${index},a:${index}`);
      });

      let killedForAbort = false;

      command
        .addOption("-var_stream_map", streamMap.join(" "))
        .output(path.join(outputDir, "%v/index.m3u8"))
        .on("start", (cmd) => this.logger.log("FFmpeg spawned with:", cmd))
        .on("progress", (progress) => {
          const now = Date.now();
          if (now - lastProgressUpdate <= PROGRESS_INTERVAL_MS) return;

          onProgress(Math.round(progress.percent || 0));

          shouldAbort()
            .then((abort) => {
              if (abort) {
                killedForAbort = true;
                command.kill("SIGKILL");
              }
            })
            .catch((err: unknown) =>
              this.logger.error(
                `Failed to check whether the transcode should abort: ${err instanceof Error ? err.message : String(err)}`,
              ),
            );

          lastProgressUpdate = now;
        })
        .on("end", () => resolve())
        .on("error", (err) => {
          if (killedForAbort) {
            reject(new TranscodeAbortedError("Entity was deleted during transcoding"));
          } else {
            reject(err);
          }
        })
        .run();
    });
  }

  private addVariant(cmd: ffmpeg.FfmpegCommand, index: number, res: string, bitrate: string) {
    cmd.outputOptions([`-map 0:v`, `-map 0:a`, `-s:v:${index}`, res, `-b:v:${index}`, bitrate]);
  }

  private async metadata(filePath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((res, rej) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) return rej(err instanceof Error ? err : new Error(String(err)));
        res(data);
      });
    });
  }
}
