import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReactionType } from "@prisma/client";

export interface TitleEngagementCounts {
  likes: number;
  dislikes: number;
  watchlistCount: number;
}

export class TitleEngagementDto {
  @ApiProperty()
  likes: number;

  @ApiProperty()
  dislikes: number;

  @ApiProperty({ description: "How many people have this title on their watchlist" })
  watchlistCount: number;

  @ApiPropertyOptional({
    enum: ReactionType,
    description: "The current viewer's own vote, null if they have not voted or are anonymous",
  })
  myReaction: ReactionType | null;

  @ApiProperty({ description: "Whether the title is on the current viewer's watchlist" })
  inWatchlist: boolean;

  constructor({
    likes = 0,
    dislikes = 0,
    watchlistCount = 0,
    myReaction = null,
    inWatchlist = false,
  }: Partial<TitleEngagementCounts & { myReaction: ReactionType | null; inWatchlist: boolean }>) {
    this.likes = likes;
    this.dislikes = dislikes;
    this.watchlistCount = watchlistCount;
    this.myReaction = myReaction;
    this.inWatchlist = inWatchlist;
  }
}
