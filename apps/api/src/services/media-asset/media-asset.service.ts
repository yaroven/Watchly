import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { settleAllOrLog } from "../../common/utils/settle-all-or-throw.util";
import { VideoType } from "../queues/video-transcoder/enums/video-type.enum";
import { VideoTranscodeScheduler } from "../queues/video-transcoder/video-transcode-scheduler.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { MultipartUploadPart } from "../s3/multipart.constants";
import { buildVideoManifestKey, VideoLocation } from "../s3/processed-key";
import { buildVideoRawKey } from "../s3/raw-key";
import { S3Service } from "../s3/s3.service";

@Injectable()
export class MediaAssetService {
  private readonly logger = new Logger(MediaAssetService.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly scheduler: VideoTranscodeScheduler,
  ) {}

  async startUpload(id: string, fileSize: number, type: VideoType) {
    return this.s3Service.startMultipartUpload(
      buildVideoRawKey(id, type),
      BucketType.RAW,
      fileSize,
    );
  }

  async completeUpload(
    id: string,
    uploadId: string,
    parts: MultipartUploadPart[],
    type: VideoType,
  ): Promise<void> {
    await this.s3Service.completeMultipartUpload(
      buildVideoRawKey(id, type),
      BucketType.RAW,
      uploadId,
      parts,
    );
    await this.scheduleTranscode(id, type);
  }

  async abortUpload(id: string, uploadId: string, type: VideoType): Promise<void> {
    await this.s3Service.abortMultipartUpload(buildVideoRawKey(id, type), BucketType.RAW, uploadId);
  }

  async scheduleTranscode(id: string, type: VideoType): Promise<void> {
    await this.scheduler.schedule({ id, type });
  }

  async getPlaybackUrl(location: VideoLocation): Promise<{ url: string }> {
    const key = buildVideoManifestKey(location);

    if (!(await this.s3Service.objectExists(key, BucketType.PROCESSED))) {
      throw new NotFoundException("This title has no playable media yet");
    }

    return { url: await this.s3Service.getReadPresignedUrl(key, BucketType.PROCESSED) };
  }

  async deleteProcessedFolder(prefix: string): Promise<void> {
    await this.s3Service.deleteFolder(prefix, BucketType.PROCESSED);
  }

  async cleanupVideoAsset(id: string, type: VideoType, processedPath?: string): Promise<void> {
    const tasks: { id: string; run: () => Promise<unknown> }[] = [
      {
        id: "scheduled-transcodes",
        run: () => this.scheduler.cancelScheduled(id, type),
      },
      {
        id: "raw-video",
        run: () => this.s3Service.deleteObject(buildVideoRawKey(id, type), BucketType.RAW),
      },
      { id: "raw-video-legacy", run: () => this.s3Service.deleteObject(id, BucketType.RAW) },
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
