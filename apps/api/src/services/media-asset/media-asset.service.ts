import { Injectable, NotFoundException } from "@nestjs/common";
import { settleAll } from "../../common/utils/settle-all-or-throw.util";
import { Logged } from "../../decorators/logged.decorator";
import { ImageService } from "../image/image.service";
import { VideoType } from "../queues/video-transcoder/enums/video-type.enum";
import { VideoTranscodeScheduler } from "../queues/video-transcoder/video-transcode-scheduler.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { MultipartUploadPart } from "../s3/multipart.constants";
import {
  buildSeasonVideoPrefix,
  buildVideoManifestKey,
  buildVideoPrefix,
  VideoLocation,
} from "../s3/processed-key";
import { S3Service } from "../s3/s3.service";
import { EpisodeAssets, SeasonAssets, TitleAssets } from "./media-asset.types";
import { rawVideoKey } from "./utils/video-location.util";

@Injectable()
export class MediaAssetService {
  constructor(
    private readonly s3Service: S3Service,
    private readonly scheduler: VideoTranscodeScheduler,
    private readonly imageService: ImageService,
  ) {}

  @Logged()
  async startUpload(id: string, fileSize: number, type: VideoType) {
    return this.s3Service.startMultipartUpload(rawVideoKey(id, type), BucketType.RAW, fileSize);
  }

  @Logged()
  async completeUpload(
    id: string,
    uploadId: string,
    parts: MultipartUploadPart[],
    type: VideoType,
  ): Promise<void> {
    const rawKey = rawVideoKey(id, type);

    await this.s3Service.completeMultipartUpload(rawKey, BucketType.RAW, uploadId, parts);
    await this.scheduler.schedule({ id, type, rawKey });
  }

  @Logged()
  async abortUpload(id: string, uploadId: string, type: VideoType): Promise<void> {
    await this.s3Service.abortMultipartUpload(rawVideoKey(id, type), BucketType.RAW, uploadId);
  }

  @Logged()
  async scheduleTranscode(id: string, type: VideoType): Promise<void> {
    await this.scheduler.schedule({ id, type, rawKey: await this.locateRawVideo(id, type) });
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
  async cleanupTitle(title: TitleAssets): Promise<void> {
    await settleAll(
      [
        () => this.removeRawVideo(title.id, VideoType.MOVIE),
        () => this.imageService.deleteStoredImage(title.posterKey),
        () =>
          this.s3Service.deleteFolder(
            buildVideoPrefix({ type: VideoType.MOVIE, titleId: title.id }),
            BucketType.PROCESSED,
          ),
        ...title.seasons.flatMap((season) => [
          () => this.imageService.deleteStoredImage(season.posterKey),
          ...season.episodes.map(
            (episode) => () => this.removeRawVideo(episode.id, VideoType.EPISODE),
          ),
        ]),
      ],
      (run) => run(),
    );
  }

  @Logged()
  async cleanupSeason(season: SeasonAssets): Promise<void> {
    await settleAll(
      [
        () => this.imageService.deleteStoredImage(season.posterKey),
        () =>
          this.s3Service.deleteFolder(
            buildSeasonVideoPrefix(season.titleId, season.id),
            BucketType.PROCESSED,
          ),
        ...season.episodes.map(
          (episode) => () => this.removeRawVideo(episode.id, VideoType.EPISODE),
        ),
      ],
      (run) => run(),
    );
  }

  @Logged()
  async cleanupEpisode({ id, seasonId, titleId }: EpisodeAssets): Promise<void> {
    await settleAll(
      [
        () => this.removeRawVideo(id, VideoType.EPISODE),
        () =>
          this.s3Service.deleteFolder(
            buildVideoPrefix({ type: VideoType.EPISODE, titleId, seasonId, episodeId: id }),
            BucketType.PROCESSED,
          ),
      ],
      (run) => run(),
    );
  }

  @Logged()
  private async removeRawVideo(id: string, type: VideoType): Promise<void> {
    await settleAll(
      [
        () => this.scheduler.cancelScheduled(id, type),
        () => this.s3Service.deleteObject(rawVideoKey(id, type), BucketType.RAW),
        () => this.s3Service.deleteObject(id, BucketType.RAW),
      ],
      (run) => run(),
    );
  }

  @Logged()
  private async locateRawVideo(id: string, type: VideoType): Promise<string> {
    const key = rawVideoKey(id, type);
    if (await this.s3Service.objectExists(key, BucketType.RAW)) return key;

    return (await this.s3Service.objectExists(id, BucketType.RAW)) ? id : key;
  }
}
