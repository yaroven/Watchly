import { GetAllUsersDto } from "../schemas/user";

const userKeys = {
  all: () => ["user"] as const,
  lists: () => [...userKeys.all(), "list"] as const,
  list: (params: GetAllUsersDto = {}) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all(), "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

export default userKeys;
