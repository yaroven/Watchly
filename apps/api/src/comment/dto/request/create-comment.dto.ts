import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateCommentDto {
  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;

  @ApiPropertyOptional({
    default: false,
    description: "Hides the text behind a warning until the reader opts in",
  })
  @IsOptional()
  @IsBoolean()
  hasSpoiler?: boolean;

  @ApiPropertyOptional({
    format: "uuid",
    description:
      "The comment being replied to. Only top-level comments can be replied to — threads are one level deep.",
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
