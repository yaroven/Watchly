import { Injectable } from "@nestjs/common";
import { Filter, Sorting } from "../../../common/pagination/pagination.types";
import { Logged } from "../../../decorators/logged.decorator";
import { EpisodeService } from "../../../services/episode/episode.service";
import { EpisodeInput, EpisodeUpdate, EpisodeView } from "../../../services/episode/episode.types";
import { MediaAssetService } from "../../../services/media-asset/media-asset.service";
import { VideoType } from "../../../services/queues/video-transcoder/enums/video-type.enum";
import { MultipartUploadPart } from "../../../services/s3/multipart.constants";

@Injectable()
export class EpisodesService {
  constructor(
    private readonly episodeService: EpisodeService,
    private readonly mediaAssetService: MediaAssetService,
  ) {}

  @Logged()
  async create(data: EpisodeInput): Promise<EpisodeView> {
    return this.episodeService.create(data);
  }

  @Logged()
  async findAll(filters?: Filter[], sort?: Sorting): Promise<EpisodeView[]> {
    return this.episodeService.findAll(filters, sort);
  }

  @Logged()
  async findOne(id: string): Promise<EpisodeView | null> {
    return this.episodeService.findOne(id);
  }

  @Logged()
  async update(id: string, data: EpisodeUpdate): Promise<EpisodeView> {
    return this.episodeService.update(id, data);
  }

  @Logged()
  async delete(id: string): Promise<EpisodeView> {
    return this.episodeService.delete(id);
  }

  @Logged()
  async getStreamUrl(id: string): Promise<{ url: string }> {
    return this.mediaAssetService.getPlaybackUrl(await this.episodeService.locate(id));
  }

  @Logged()
  async startUpload(id: string, fileSize: number) {
    return this.mediaAssetService.startUpload(id, fileSize, VideoType.EPISODE);
  }

  @Logged()
  async completeUpload(id: string, uploadId: string, parts: MultipartUploadPart[]): Promise<void> {
    await this.mediaAssetService.completeUpload(id, uploadId, parts, VideoType.EPISODE);
  }

  @Logged()
  async abortUpload(id: string, uploadId: string): Promise<void> {
    await this.mediaAssetService.abortUpload(id, uploadId, VideoType.EPISODE);
  }

  @Logged()
  async scheduleTranscode(id: string): Promise<void> {
    await this.mediaAssetService.scheduleTranscode(id, VideoType.EPISODE);
  }
}
