import { IsInt, IsString, IsUUID } from "class-validator";

export class CreateSeasonDto {
  @IsInt()
  number: number;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsUUID()
  titleId: string;
}
