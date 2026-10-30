import { User } from "@prisma/client";
import { UserView } from "./user.types";

export const toUserView = (user: Omit<User, "password">, avatarUrl: string | null): UserView => ({
  id: user.id,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  displayName: user.displayName,
  avatarUrl,
});
