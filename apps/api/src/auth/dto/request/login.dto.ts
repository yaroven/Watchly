import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class LoginRequestDto {
  @ApiProperty({ maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ minLength: 8, maxLength: 255, description: "Plain text; hashed before storage" })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password: string;
}
