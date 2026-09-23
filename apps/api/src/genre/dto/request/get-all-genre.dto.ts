import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { PaginatedQueryDto } from "../../../common/dto/paginated-query.dto";

export class GetAllGenreDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ maxLength: 100, description: "Case-insensitive substring match on name" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
