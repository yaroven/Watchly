import { ApiProperty } from "@nestjs/swagger";
import { SyncExternalRatingsResult } from "../../../../../services/external-ratings/external-ratings.types";

export class SyncExternalRatingsResponseDto implements SyncExternalRatingsResult {
  @ApiProperty({ description: "Titles considered for syncing" })
  total: number;

  @ApiProperty({ description: "Titles that got at least one rating written" })
  synced: number;
}
