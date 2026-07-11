import { IsInt, IsOptional, IsString } from "class-validator";

export class UpdateSeasonDto {
  @IsInt()
  @IsOptional()
  number?: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  posterUrl?: string;
}
