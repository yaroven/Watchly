import { Injectable, Logger } from "@nestjs/common";
import { settleAllOrLog } from "../common/settle-all-or-throw.util";
import BucketType from "../s3/enums/bucket-type.enum";
import { MultipartUploadPart } from "../s3/multipart.constants";
import { S3Service } from "../s3/s3.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";

@Injectable()
export class MediaAssetService {
  private readonly logger = new Logger(MediaAssetService.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly videoTranscoderService: VideoTranscoderService,
  ) {}

  async startUpload(id: string, fileSize: number) {
    return this.s3Service.startMultipartUpload(id, BucketType.RAW, fileSize);
  }

  /**
   * Schedules the transcode itself rather than waiting for the S3 event to come
   * back through SQS. The queue job id is derived from (type, id), so when the
   * event path is also live it dedupes into this same job instead of running a
   * second one — which is what lets a deployment without S3 notifications
   * (MinIO, say) still transcode.
   */
  async completeUpload(
    id: string,
    uploadId: string,
    parts: MultipartUploadPart[],
    type: VideoType,
  ): Promise<void> {
    await this.s3Service.completeMultipartUpload(id, BucketType.RAW, uploadId, parts);
    await this.scheduleTranscode(id, type);
  }

  async abortUpload(id: string, uploadId: string): Promise<void> {
    await this.s3Service.abortMultipartUpload(id, BucketType.RAW, uploadId);
  }

  async scheduleTranscode(id: string, type: VideoType): Promise<void> {
    await this.videoTranscoderService.scheduleTranscodeVideo({ id, type });
  }

  async getReadUrl(key: string): Promise<{ url: string }> {
    const url = await this.s3Service.getReadPresignedUrl(key, BucketType.PROCESSED);
    return { url };
  }

  async deleteProcessedFolder(prefix: string): Promise<void> {
    await this.s3Service.deleteFolder(prefix, BucketType.PROCESSED);
  }

  async cleanupVideoAsset(id: string, type: VideoType, processedPath?: string): Promise<void> {
    const tasks: { id: string; run: () => Promise<unknown> }[] = [
      {
        id: "scheduled-transcodes",
        run: () => this.videoTranscoderService.cancelScheduledTranscodes(id, type),
      },
      { id: "raw-video", run: () => this.s3Service.deleteObject(id, BucketType.RAW) },
    ];

    if (processedPath !== undefined) {
      tasks.push({
        id: "processed-folder",
        run: () => this.s3Service.deleteFolder(processedPath, BucketType.PROCESSED),
      });
    }

    await settleAllOrLog(
      tasks,
      (task) => task.run(),
      (task) => task.id,
      this.logger,
      { itemLabel: "video-asset", parentLabel: VideoType[type].toLowerCase(), parentId: id },
    );
  }
}
