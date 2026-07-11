import { IsInt, IsOptional, IsString } from "class-validator";

export class UpdateEpisodeDto {
  @IsInt()
  @IsOptional()
  number?: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
