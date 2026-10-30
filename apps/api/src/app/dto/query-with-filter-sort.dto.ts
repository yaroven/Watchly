import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class QueryWithFilterSortDto {
  @ApiPropertyOptional({
    type: [String],
    description: "See the route's @FilteringParams for valid values",
  })
  @IsOptional()
  @IsString({ each: true })
  filter?: string[];

  @ApiPropertyOptional({ description: "See the route's @SortingParams for valid values" })
  @IsOptional()
  @IsString()
  sort?: string;
}
