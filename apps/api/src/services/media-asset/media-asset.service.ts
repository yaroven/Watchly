import { Injectable, NotFoundException } from "@nestjs/common";
import { settleAll } from "../../common/utils/settle-all-or-throw.util";
import { Logged } from "../../decorators/logged.decorator";
import { VideoType } from "../queues/video-transcoder/enums/video-type.enum";
import { VideoTranscodeScheduler } from "../queues/video-transcoder/video-transcode-scheduler.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { MultipartUploadPart } from "../s3/multipart.constants";
import { buildVideoManifestKey, VideoLocation } from "../s3/processed-key";
import { buildVideoRawKey } from "../s3/raw-key";
import { S3Service } from "../s3/s3.service";

@Injectable()
export class MediaAssetService {
  constructor(
    private readonly s3Service: S3Service,
    private readonly scheduler: VideoTranscodeScheduler,
  ) {}

  @Logged()
  async startUpload(id: string, fileSize: number, type: VideoType) {
    return this.s3Service.startMultipartUpload(
      buildVideoRawKey(id, type),
      BucketType.RAW,
      fileSize,
    );
  }

  @Logged()
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

  @Logged()
  async abortUpload(id: string, uploadId: string, type: VideoType): Promise<void> {
    await this.s3Service.abortMultipartUpload(buildVideoRawKey(id, type), BucketType.RAW, uploadId);
  }

  @Logged()
  async scheduleTranscode(id: string, type: VideoType): Promise<void> {
    await this.scheduler.schedule({ id, type });
  }

  @Logged()
  async getPlaybackUrl(location: VideoLocation): Promise<{ url: string }> {
    const key = buildVideoManifestKey(location);

    if (!(await this.s3Service.objectExists(key, BucketType.PROCESSED))) {
      throw new NotFoundException("This title has no playable media yet");
    }

    return { url: await this.s3Service.getReadPresignedUrl(key, BucketType.PROCESSED) };
  }

  @Logged()
  async deleteProcessedFolder(prefix: string): Promise<void> {
    await this.s3Service.deleteFolder(prefix, BucketType.PROCESSED);
  }

  @Logged()
  async cleanupVideoAsset(id: string, type: VideoType, processedPath?: string): Promise<void> {
    const tasks: (() => Promise<unknown>)[] = [
      () => this.scheduler.cancelScheduled(id, type),
      () => this.s3Service.deleteObject(buildVideoRawKey(id, type), BucketType.RAW),
      () => this.s3Service.deleteObject(id, BucketType.RAW),
    ];

    if (processedPath !== undefined) {
      tasks.push(() => this.s3Service.deleteFolder(processedPath, BucketType.PROCESSED));
    }

    await settleAll(tasks, (run) => run());
  }
}
