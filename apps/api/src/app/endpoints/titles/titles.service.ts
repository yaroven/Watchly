import { Injectable } from "@nestjs/common";
import { Filter, PageQuery, Sorting } from "../../../common/pagination/pagination.types";
import { Logged } from "../../../decorators/logged.decorator";
import { MediaAssetService } from "../../../services/media-asset/media-asset.service";
import { VideoType } from "../../../services/queues/video-transcoder/enums/video-type.enum";
import { MultipartUploadPart } from "../../../services/s3/multipart.constants";
import { withVote } from "../../../services/title/title-engagement.mapper";
import { TitleEngagementService } from "../../../services/title/title-engagement.service";
import { TitleEngagementView } from "../../../services/title/title-engagement.types";
import { TitleService } from "../../../services/title/title.service";
import { StoredTitleView, TitleInput, TitleView } from "../../../services/title/title.types";
import { VoteStateService } from "../../../services/vote-cache/vote-state.service";

@Injectable()
export class TitlesService {
  constructor(
    private readonly titleService: TitleService,
    private readonly engagementService: TitleEngagementService,
    private readonly mediaAssetService: MediaAssetService,
    private readonly voteState: VoteStateService,
  ) {}

  @Logged()
  async create(data: TitleInput): Promise<TitleView> {
    return this.titleService.create(data);
  }

  @Logged()
  async delete(id: string): Promise<TitleView> {
    return this.titleService.delete(id);
  }

  @Logged()
  async getEngagement(id: string, viewerId: string | null): Promise<TitleEngagementView> {
    return this.engagementService.getEngagement(id, viewerId);
  }

  @Logged()
  async rate(id: string, userId: string, score: number): Promise<TitleEngagementView> {
    return this.engagementService.rate(id, userId, score);
  }

  @Logged()
  async removeRating(id: string, userId: string): Promise<TitleEngagementView> {
    return this.engagementService.removeRating(id, userId);
  }

  @Logged()
  async startUpload(id: string, fileSize: number) {
    return this.mediaAssetService.startUpload(id, fileSize, VideoType.MOVIE);
  }

  @Logged()
  async completeUpload(id: string, uploadId: string, parts: MultipartUploadPart[]): Promise<void> {
    await this.mediaAssetService.completeUpload(id, uploadId, parts, VideoType.MOVIE);
  }

  @Logged()
  async abortUpload(id: string, uploadId: string): Promise<void> {
    await this.mediaAssetService.abortUpload(id, uploadId, VideoType.MOVIE);
  }

  @Logged()
  async scheduleTranscode(id: string): Promise<void> {
    await this.mediaAssetService.scheduleTranscode(id, VideoType.MOVIE);
  }

  @Logged()
  async getPlaybackUrl(id: string): Promise<{ url: string }> {
    return this.mediaAssetService.getPlaybackUrl({ type: VideoType.MOVIE, titleId: id });
  }

  @Logged()
  async findAll(
    query: PageQuery,
    sort?: Sorting,
    filters?: Filter[],
    viewerId?: string,
  ): Promise<{ items: TitleView[]; totalCount: number }> {
    const { items, totalCount } = await this.titleService.findAll(query, sort, filters, viewerId);

    return { items: await this.withVotes(items, viewerId), totalCount };
  }

  @Logged()
  async findOne(id: string, viewerId?: string): Promise<TitleView | null> {
    const title = await this.titleService.findOne(id, viewerId);
    if (!title) return null;

    const [view] = await this.withVotes([title], viewerId);
    return view;
  }

  @Logged()
  async update(id: string, data: TitleInput, viewerId?: string): Promise<TitleView> {
    const [view] = await this.withVotes(
      [await this.titleService.update(id, data, viewerId)],
      viewerId,
    );
    return view;
  }

  @Logged({ completedLevel: "debug" })
  private async withVotes(titles: StoredTitleView[], viewerId?: string): Promise<TitleView[]> {
    const votes = await this.voteState.forTitles(
      titles.map((title) => ({
        id: title.id,
        storedVote: title.engagement.viewer?.storedReaction ?? null,
      })),
      viewerId ?? null,
    );

    return titles.map((title) => ({
      ...title,
      engagement: withVote(title.engagement, votes.get(title.id) ?? null),
    }));
  }
}
