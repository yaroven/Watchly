import createMutationHook from "@/shared/api/createMutationHook";
import { UseMutationOptions } from "@tanstack/react-query";
import { UpdateUserRoleDto, User } from "../schemas/user";
import userKeys from "./user.keys";
import userService from "./user.service";

export const useUpdateUserRole = (
  options?: Omit<UseMutationOptions<User, Error, { id: string; data: UpdateUserRoleDto }>, "mutationFn">,
) => {
  const useUpdateUserRole = createMutationHook({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRoleDto }) => userService.updateRole(id, data),
    getInvalidateKeys: ({ id }: { id: string; data: UpdateUserRoleDto }) => [userKeys.all(), userKeys.detail(id)],
  });
  return useUpdateUserRole(options);
};
