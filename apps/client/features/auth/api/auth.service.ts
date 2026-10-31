import Role from "@/types/role";
import api from "@shared/api/axios";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface AuthSession {
  accessToken: string;
  userId: string;
  role: Role;
}

const AuthService = {
  login: async (payload: LoginPayload): Promise<AuthSession> => {
    const { data } = await api.post<AuthSession>("/auth/login", payload);
    return data;
  },

  register: async (payload: RegisterPayload): Promise<AuthSession> => {
    const { data } = await api.post<AuthSession>("/auth/register", payload);
    return data;
  },
};

export default AuthService;
