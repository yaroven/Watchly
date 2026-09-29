import { ApiProperty } from "@nestjs/swagger";

export class SyncExternalRatingsResponseDto {
  @ApiProperty({ description: "Titles considered for syncing" })
  total: number;

  @ApiProperty({ description: "Titles that got at least one rating written" })
  synced: number;

  constructor(data: { total: number; synced: number }) {
    this.total = data.total;
    this.synced = data.synced;
  }
}
