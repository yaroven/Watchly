import { ApiProperty } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { IsEnum } from "class-validator";
import { UserUpdate } from "../../../../../services/user/user.types";

export class UpdateUserRoleDto implements UserUpdate {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;
}
