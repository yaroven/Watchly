import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { PageQuery } from "../../common/pagination/pagination.types";

export class PaginatedQueryDto implements PageQuery {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
