import { ApiProperty, OmitType } from "@nestjs/swagger";
import {
  CardTitleEngagementView,
  CardViewerTitleEngagementView,
} from "../../../../../services/title/title-engagement.types";
import { CardTitleView } from "../../../../../services/title/title.types";
import {
  TitleEngagementDto,
  ViewerTitleEngagementDto,
} from "../../../titles/dto/response/title-engagement.dto";
import { TitleResponseDto } from "../../../titles/dto/response/title-response.dto";

export class WatchlistViewerEngagementDto
  extends OmitType(ViewerTitleEngagementDto, ["reaction"] as const)
  implements CardViewerTitleEngagementView {}

export class WatchlistTitleEngagementDto
  extends OmitType(TitleEngagementDto, ["viewer"] as const)
  implements CardTitleEngagementView
{
  @ApiProperty({
    type: WatchlistViewerEngagementDto,
    nullable: true,
    description:
      "What the viewer did, without their vote: a watchlist card never shows it, so the list does not read the vote cache.",
  })
  viewer: WatchlistViewerEngagementDto | null;
}

export class WatchlistTitleResponseDto
  extends OmitType(TitleResponseDto, ["engagement"] as const)
  implements CardTitleView
{
  @ApiProperty({ type: WatchlistTitleEngagementDto })
  engagement: WatchlistTitleEngagementDto;
}
