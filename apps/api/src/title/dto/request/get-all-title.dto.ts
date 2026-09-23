import { ApiPropertyOptional } from "@nestjs/swagger";
import { TitleType, TranscodingStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginatedQueryDto } from "../../../common/dto/paginated-query.dto";

export class GetAllTitleDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ maxLength: 255, description: "Case-insensitive substring match on name" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ enum: TitleType })
  @IsOptional()
  @IsEnum(TitleType)
  type?: TitleType;

  @ApiPropertyOptional({ enum: TranscodingStatus })
  @IsOptional()
  @IsEnum(TranscodingStatus)
  transcodingStatus?: TranscodingStatus;
}
