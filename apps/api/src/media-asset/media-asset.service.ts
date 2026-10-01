import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { settleAllOrLog } from "../common/settle-all-or-throw.util";
import BucketType from "../s3/enums/bucket-type.enum";
import { MultipartUploadPart } from "../s3/multipart.constants";
import { buildVideoManifestKey, VideoLocation } from "../s3/processed-key";
import { buildVideoRawKey } from "../s3/raw-key";
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

  async startUpload(id: string, fileSize: number, type: VideoType) {
    return this.s3Service.startMultipartUpload(
      buildVideoRawKey(id, type),
      BucketType.RAW,
      fileSize,
    );
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
    await this.videoTranscoderService.scheduleTranscodeVideo({ id, type });
  }

  /**
   * A playback URL, or 404 if there is nothing to play.
   *
   * The existence check is the point. Presigning is string construction, so the
   * previous shape — hand a key in, get a URL back — could not fail, and both
   * callers had a `if (!url) throw new NotFoundException(...)` that never once
   * ran: one of them was testing a wrapper object that is always truthy, and the
   * other a string that is always non-empty. A title that was never transcoded
   * answered 200 with a URL the browser then 404s on.
   */
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
        run: () => this.videoTranscoderService.cancelScheduledTranscodes(id, type),
      },
      {
        id: "raw-video",
        run: () => this.s3Service.deleteObject(buildVideoRawKey(id, type), BucketType.RAW),
      },
      // Uploads that predate the key scheme are still sitting under the bare id.
      // Best-effort, and it disappears once nothing old is left in the bucket.
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
