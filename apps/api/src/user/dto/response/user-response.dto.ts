import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Role, User } from "@prisma/client";

/** Constructor whitelist-copies fields — `password` is never assigned, even if the input row carries it. */
export class UserResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({
    description: "Shown next to anything the user writes; null until they set one",
  })
  displayName: string | null;

  @ApiPropertyOptional({
    description: "Built from the stored object key; the row holds a key, never a URL",
  })
  avatarUrl: string | null;

  constructor(user: Omit<User, "password">, avatarUrl: string | null = null) {
    this.id = user.id;
    this.email = user.email;
    this.role = user.role;
    this.createdAt = user.createdAt;
    this.displayName = user.displayName;
    this.avatarUrl = avatarUrl;
  }
}
