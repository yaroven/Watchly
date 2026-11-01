import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { MediaAssetService } from "../../../services/media-asset/media-asset.service";
import { VideoType } from "../../../services/queues/video-transcoder/enums/video-type.enum";
import { TitleEngagementService } from "../../../services/title/title-engagement.service";
import { TitleService } from "../../../services/title/title.service";
import { StoredTitleView } from "../../../services/title/title.types";
import { VoteStateService } from "../../../services/vote-cache/vote-state.service";
import { TitlesService } from "./titles.service";

const stored = (id: string, storedReaction: ReactionType | null, viewer = true): StoredTitleView =>
  ({
    id,
    engagement: {
      averageScore: null,
      ratingCount: 0,
      likes: 0,
      dislikes: 0,
      watchlistCount: 0,
      commentCount: 0,
      viewer: viewer ? { score: 7, storedReaction, inWatchlist: true } : null,
    },
  }) as StoredTitleView;

describe("TitlesService", () => {
  let service: TitlesService;
  let titleService: { findAll: jest.Mock; findOne: jest.Mock; update: jest.Mock };
  let voteState: { forTitles: jest.Mock };
  let mediaAssets: { startUpload: jest.Mock; getPlaybackUrl: jest.Mock };

  beforeEach(async () => {
    titleService = { findAll: jest.fn(), findOne: jest.fn(), update: jest.fn() };
    voteState = { forTitles: jest.fn().mockResolvedValue(new Map()) };
    mediaAssets = { startUpload: jest.fn(), getPlaybackUrl: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TitlesService,
        { provide: TitleService, useValue: titleService },
        { provide: VoteStateService, useValue: voteState },
        { provide: TitleEngagementService, useValue: {} },
        { provide: MediaAssetService, useValue: mediaAssets },
      ],
    }).compile();

    service = moduleRef.get(TitlesService);
  });

  it("should hand the cache what Postgres holds, so a miss falls back to it", async () => {
    titleService.findAll.mockResolvedValue({
      items: [stored("t-1", ReactionType.LIKE), stored("t-2", null)],
      totalCount: 2,
    });

    await service.findAll({ page: 1, limit: 10 }, undefined, [], "viewer-1");

    expect(voteState.forTitles).toHaveBeenCalledWith(
      [
        { id: "t-1", storedVote: ReactionType.LIKE },
        { id: "t-2", storedVote: null },
      ],
      "viewer-1",
    );
  });

  it("should render the vote the cache settled on, not the stored one", async () => {
    titleService.findOne.mockResolvedValue(stored("t-1", ReactionType.LIKE));
    voteState.forTitles.mockResolvedValue(new Map([["t-1", ReactionType.DISLIKE]]));

    const result = await service.findOne("t-1", "viewer-1");

    expect(result?.engagement.viewer).toEqual({
      score: 7,
      reaction: ReactionType.DISLIKE,
      inWatchlist: true,
    });
  });

  it("should render a settled withdrawal as no vote", async () => {
    titleService.update.mockResolvedValue(stored("t-1", ReactionType.LIKE));
    voteState.forTitles.mockResolvedValue(new Map([["t-1", null]]));

    const result = await service.update("t-1", {} as never, "viewer-1");

    expect(result.engagement.viewer?.reaction).toBeNull();
  });

  it("should keep an unknown viewer unknown and ask the cache for nobody", async () => {
    titleService.findOne.mockResolvedValue(stored("t-1", null, false));

    const result = await service.findOne("t-1");

    expect(result?.engagement.viewer).toBeNull();
    expect(voteState.forTitles).toHaveBeenCalledWith(expect.anything(), null);
  });

  it("should answer null for a title that does not exist", async () => {
    titleService.findOne.mockResolvedValue(null);

    await expect(service.findOne("gone", "viewer-1")).resolves.toBeNull();
    expect(voteState.forTitles).not.toHaveBeenCalled();
  });

  it("should treat a title's video as the movie", async () => {
    await service.startUpload("t-1", 1024);
    await service.getPlaybackUrl("t-1");

    expect(mediaAssets.startUpload).toHaveBeenCalledWith("t-1", 1024, VideoType.MOVIE);
    expect(mediaAssets.getPlaybackUrl).toHaveBeenCalledWith({
      type: VideoType.MOVIE,
      titleId: "t-1",
    });
  });
});
