import { IsInt, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateSeasonDto {
  @IsInt()
  number: number;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  posterUrl?: string;

  @IsUUID()
  titleId: string;
}
