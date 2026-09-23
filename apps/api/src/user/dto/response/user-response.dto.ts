import { ApiProperty } from "@nestjs/swagger";
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

  constructor(user: Omit<User, "password">) {
    this.id = user.id;
    this.email = user.email;
    this.role = user.role;
    this.createdAt = user.createdAt;
  }
}
