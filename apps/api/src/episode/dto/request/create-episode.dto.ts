import { IsInt, IsString, IsUUID } from "class-validator";

export class CreateEpisodeDto {
  @IsInt()
  number: number;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsUUID()
  seasonId: string;
}
