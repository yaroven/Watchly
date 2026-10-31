import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { UserView } from "../../../../../services/user/user.types";

export class UserResponseDto implements UserView {
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
}
