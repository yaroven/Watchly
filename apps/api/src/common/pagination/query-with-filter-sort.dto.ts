import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

/**
 * Whitelist placeholder for `?filter=`/`?sort=`. The actual values are read via
 * `@FilteringParams`/`@SortingParams`, not this DTO — but `forbidNonWhitelisted` validates
 * the *whole* query object against whatever DTO is bound with `@Query()`, so these still have
 * to be declared somewhere or every filtered/sorted request 400s with "property … should not exist".
 */
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
