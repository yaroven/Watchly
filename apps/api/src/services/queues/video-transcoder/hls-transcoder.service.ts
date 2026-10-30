import { Injectable, Logger } from "@nestjs/common";
import { FfmpegRunner } from "../../ffmpeg/ffmpeg.runner";
import { buildHlsJob } from "./utils/hls-job.util";
import { TranscodeAbortedError } from "./utils/transcode-aborted.error";
import { PROGRESS_INTERVAL_MS } from "./video-profile.const";

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

  constructor(private readonly ffmpeg: FfmpegRunner) {}

  async probeWidth(filePath: string): Promise<number> {
    const { streams } = await this.ffmpeg.probe(filePath);

    return streams.find((stream) => stream.kind === "video")?.width || 0;
  }

  async run({
    input,
    outputDir,
    sourceWidth,
    onProgress,
    shouldAbort,
  }: HlsTranscodeRequest): Promise<void> {
    let lastProgressUpdate = 0;
    let killedForAbort = false;

    const handle = this.ffmpeg.start(buildHlsJob(input, outputDir, sourceWidth), {
      onStart: (commandLine) => this.logger.log("FFmpeg spawned with:", commandLine),
      onProgress: (percent) => {
        const now = Date.now();
        if (now - lastProgressUpdate <= PROGRESS_INTERVAL_MS) return;

        onProgress(Math.round(percent || 0));

        shouldAbort()
          .then((abort) => {
            if (abort) {
              killedForAbort = true;
              handle.kill();
            }
          })
          .catch((err: unknown) =>
            this.logger.error(
              `Failed to check whether the transcode should abort: ${err instanceof Error ? err.message : String(err)}`,
            ),
          );

        lastProgressUpdate = now;
      },
    });

    try {
      await handle.done;
    } catch (err) {
      if (killedForAbort) throw new TranscodeAbortedError("Entity was deleted during transcoding");
      throw err;
    }
  }
}
