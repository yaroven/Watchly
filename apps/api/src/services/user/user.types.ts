import { Role } from "@prisma/client";

export interface UserInput {
  email: string;
  password: string;
  role?: Role;
}

export type UserUpdate = Partial<UserInput>;

export interface UserView {
  id: string;
  email: string;
  role: Role;
  createdAt: Date;
  displayName: string | null;
  avatarUrl: string | null;
}
