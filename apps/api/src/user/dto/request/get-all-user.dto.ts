import { ApiPropertyOptional } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginatedQueryDto } from "../../../common/dto/paginated-query.dto";

export class GetAllUserDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ maxLength: 255, description: "Case-insensitive substring match on email" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
