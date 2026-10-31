import { Injectable } from "@nestjs/common";
import { Logged } from "../../../decorators/logged.decorator";
import { FfmpegRunner } from "../../ffmpeg/ffmpeg.runner";
import { buildHlsJob } from "./utils/hls-job.util";
import { abortIsWarning, TranscodeAbortedError } from "./utils/transcode-aborted.error";
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
  constructor(private readonly ffmpeg: FfmpegRunner) {}

  @Logged()
  async probeWidth(filePath: string): Promise<number> {
    const { streams } = await this.ffmpeg.probe(filePath);

    return streams.find((stream) => stream.kind === "video")?.width || 0;
  }

  @Logged({ failedLevel: abortIsWarning })
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
      onStart: (commandLine) => this.spawned(commandLine),
      onProgress: (percent) => {
        const now = Date.now();
        if (now - lastProgressUpdate <= PROGRESS_INTERVAL_MS) return;

        onProgress(Math.round(percent || 0));

        void this.abortIfGone(shouldAbort, () => {
          killedForAbort = true;
          handle.kill();
        });

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

  @Logged({ completedLevel: "debug" })
  private async abortIfGone(shouldAbort: () => Promise<boolean>, abort: () => void): Promise<void> {
    try {
      if (await shouldAbort()) abort();
    } catch {
      // @Logged has already logged this failure
    }
  }

  @Logged()
  private spawned(commandLine: string): string {
    return commandLine;
  }
}
