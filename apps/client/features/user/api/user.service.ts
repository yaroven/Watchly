import { parseApiDate } from "@/shared/lib/parse-api-date";
import api from "@shared/api/axios";
import { GetAllUsersDto, UpdateUserRoleDto, User } from "../schemas/user";

const prefix = "user";

interface ApiUser extends Omit<User, "createdAt"> {
  createdAt: string;
}

const mapUser = (user: ApiUser): User => ({
  ...user,
  createdAt: parseApiDate(user.createdAt),
});

const UserService = {
  getAll: async ({ page = 1, limit = 20, searchString = "", role }: GetAllUsersDto = {}): Promise<{
    items: User[];
    totalCount: number;
  }> => {
    const filter: string[] = [];
    if (searchString) filter.push(`email:like:${searchString}`);
    if (role) filter.push(`role:eq:${role}`);

    const { data } = await api.get<{ items: ApiUser[]; totalCount: number }>(`/${prefix}`, {
      params: { page, limit, filter: filter.length ? filter : undefined },
      paramsSerializer: { indexes: null },
    });
    return {
      ...data,
      items: data.items.map(mapUser),
    };
  },

  getById: async (id: string): Promise<User> => {
    const { data } = await api.get<ApiUser>(`/${prefix}/${id}`);
    return mapUser(data);
  },

  updateRole: async (id: string, data: UpdateUserRoleDto): Promise<User> => {
    const { data: user } = await api.patch<ApiUser>(`/${prefix}/${id}/role`, data);
    return mapUser(user);
  },
};

export default UserService;
