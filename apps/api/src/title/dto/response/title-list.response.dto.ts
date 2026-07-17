import { ApiProperty } from "@nestjs/swagger";
import { TitleEntity } from "../../entities/title.entity";

export class TitleListResponseDto {
  @ApiProperty({ type: [TitleEntity] })
  items: TitleEntity[];

  @ApiProperty()
  totalCount: number;
}
