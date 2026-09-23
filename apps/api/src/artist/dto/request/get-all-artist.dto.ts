import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { PaginatedQueryDto } from "../../../common/dto/paginated-query.dto";

export class GetAllArtistDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ maxLength: 255, description: "Case-insensitive substring match on name" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
