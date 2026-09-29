import Role from "@/types/role";

export interface UsersPageFilters {
  search?: string;
  role?: Role | "";
  page?: number;
}
