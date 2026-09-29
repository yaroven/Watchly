import Role from "@/types/role";

export { Role };

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: Date;
}

export interface GetAllUsersDto {
  page?: number;
  limit?: number;
  searchString?: string;
  role?: Role;
}

export interface UpdateUserRoleDto {
  role: Role;
}
