import { ApiProperty } from "@nestjs/swagger";
import { TitleResponseDto } from "./title-response.dto";

export class TitleListResponseDto {
  @ApiProperty({ type: [TitleResponseDto] })
  items: TitleResponseDto[];

  @ApiProperty()
  totalCount: number;
}
