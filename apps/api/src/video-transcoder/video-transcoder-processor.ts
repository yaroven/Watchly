import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { TranscodingStatus } from "@prisma/client";
import { Job } from "bullmq";
import * as fs from "fs-extra";
import * as path from "path";
import { Histogram, Registry } from "prom-client";
import logJobFailure from "../common/utils/log-job-failure.util";
import withWorkDir from "../common/utils/work-dir.util";
import { METRICS_REGISTRY } from "../metrics/metrics.const";
import { TranscodeVideoDto } from "./dto/request/transcode-video.dto";
import { VideoType } from "./enums/video-type.enum";
import { VIDEO_TRANSCODE_QUEUE_NAME } from "./video-transcode-queue.options";
import { TranscodeAbortedError, VideoTranscoderService } from "./video-transcoder.service";

@Processor(VIDEO_TRANSCODE_QUEUE_NAME, {
  concurrency: Number(process.env.VIDEO_TRANSCODE_CONCURRENCY) || 2,
})
@Injectable()
export class VideoTranscoderProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoTranscoderProcessor.name);
  private readonly duration: Histogram<"kind" | "outcome">;

  constructor(
    private readonly videoTranscodeService: VideoTranscoderService,
    @Inject(METRICS_REGISTRY) registry: Registry,
  ) {
    super();

    this.duration = new Histogram({
      name: "video_transcode_duration_seconds",
      help: "Time spent transcoding one video, by outcome",
      labelNames: ["kind", "outcome"],
      // Minutes to an hour. An image's buckets are two orders of magnitude
      // lower, which is why that is a metric of its own rather than a label
      // on this one — a histogram carries one bucket set for every series.
      buckets: [10, 30, 60, 300, 600, 1800, 3600],
      registers: [registry],
    });
  }

  async process(job: Job<TranscodeVideoDto>) {
    const { type, id } = job.data;
    const jobId = job.id;
    const stop = this.duration.startTimer({ kind: VideoType[type].toLowerCase() });

    return withWorkDir(`transcode-${jobId}`, async (workDir) => {
      const inputPath = path.join(workDir, id);
      const outputDir = path.join(workDir, "output");

      try {
        await this.videoTranscodeService.updateStatus(id, type, TranscodingStatus.PROCESSING);
        await this.videoTranscodeService.updateProgress(id, type, 0);
        await fs.ensureDir(outputDir);
        await this.videoTranscodeService.transcodeVideo(id, inputPath, outputDir, type);

        await this.videoTranscodeService.updateStatus(id, type, TranscodingStatus.COMPLETED);
        await this.videoTranscodeService.updateProgress(id, type, 100);
        this.logger.log(`Job ${jobId} finished successfully.`);
        stop({ outcome: "success" });
        return { result: "success" };
      } catch (error) {
        // An abort is a deleted entity, not a failure: the job returns rather
        // than throwing, so BullMQ does not retry it. Counting it as failed
        // would make a routine deletion look like a broken pipeline.
        if (error instanceof TranscodeAbortedError) {
          this.logger.warn(`Job ${jobId} aborted: ${error.message}`);
          stop({ outcome: "aborted" });
          return { result: "aborted" };
        }

        await this.videoTranscodeService.updateStatus(id, type, TranscodingStatus.FAILED);
        logJobFailure(this.logger, `Job ${jobId}`, error);
        stop({ outcome: "failed" });
        throw error;
      }
    });
  }
}
