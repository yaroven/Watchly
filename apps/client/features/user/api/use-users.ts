import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { GetAllUsersDto, User } from "../schemas/user";
import userKeys from "./user.keys";
import userService from "./user.service";

export const useUsers = (
  params: GetAllUsersDto = {},
  options?: Omit<
    UseQueryOptions<{ items: User[]; totalCount: number }, Error, { items: User[]; totalCount: number }, readonly unknown[]>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userService.getAll(params),
    ...options,
  });
};

export const useUser = (id: string, options?: Omit<UseQueryOptions<User, Error, User, readonly unknown[]>, "queryKey" | "queryFn">) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userService.getById(id),
    ...options,
  });
};

export default useUsers;
