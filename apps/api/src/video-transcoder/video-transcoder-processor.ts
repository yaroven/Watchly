import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { TranscodingStatus } from "@prisma/client";
import { Job } from "bullmq";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { TranscodeVideoDto } from "./dto/request/transcode-video.dto";
import { VIDEO_TRANSCODE_QUEUE_NAME } from "./video-transcode-queue.options";
import { TranscodeAbortedError, VideoTranscoderService } from "./video-transcoder.service";

@Processor(VIDEO_TRANSCODE_QUEUE_NAME, {
  concurrency: Number(process.env.VIDEO_TRANSCODE_CONCURRENCY) || 2,
})
@Injectable()
export class VideoTranscoderProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoTranscoderProcessor.name);
  constructor(private readonly videoTranscodeService: VideoTranscoderService) {
    super();
  }

  async process(job: Job<TranscodeVideoDto>) {
    const { type, id } = job.data;
    const jobId = job.id;

    const tempDir = path.join(os.tmpdir(), `transcode-${jobId}`);
    const inputPath = path.join(tempDir, id);
    const outputDir = path.join(tempDir, "output");

    try {
      await this.videoTranscodeService.updateStatus(id, type, TranscodingStatus.PROCESSING);
      await this.videoTranscodeService.updateProgress(id, type, 0);
      await fs.ensureDir(outputDir);
      await this.videoTranscodeService.transcodeVideo(id, inputPath, outputDir, type);

      await this.videoTranscodeService.updateStatus(id, type, TranscodingStatus.COMPLETED);
      await this.videoTranscodeService.updateProgress(id, type, 100);
      this.logger.log(`Job ${jobId} finished successfully.`);
      return { result: "success" };
    } catch (error) {
      if (error instanceof TranscodeAbortedError) {
        this.logger.warn(`Job ${jobId} aborted: ${error.message}`);
        return { result: "aborted" };
      }

      await this.videoTranscodeService.updateStatus(id, type, TranscodingStatus.FAILED);
      this.logger.error(`Job ${jobId} failed:`, error);
      throw error;
    } finally {
      await fs.remove(tempDir);
    }
  }
}
