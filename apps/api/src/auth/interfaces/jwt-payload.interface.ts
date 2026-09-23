import { Role } from "@prisma/client";

/** Shape signed into the access token by `AuthService.login` and read back by `JwtStrategy`. */
export interface JwtPayload {
  userId: string;
  role: Role;
}
