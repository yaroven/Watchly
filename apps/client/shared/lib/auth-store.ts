import Role from "@/types/role";
import { createStore, useStore } from "zustand";

export type AuthStatus = "idle" | "loading" | "resolved";

export interface AuthStoreState {
  token: string | null;
  role: Role | null;
  userId: string | null;
  status: AuthStatus;
  setSession: (session: { token: string; role: Role; userId: string }) => void;
  setToken: (token: string | null) => void;
  setRole: (role: Role | null) => void;
  setUserId: (userId: string | null) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
}

export const createAuthStore = () =>
  createStore<AuthStoreState>((set) => ({
    token: null,
    role: null,
    userId: null,
    status: "idle",

    setSession: ({ token, role, userId }) => set({ token, role, userId }),
    setToken: (token) => set({ token }),
    setRole: (role) => set({ role }),
    setUserId: (userId) => set({ userId }),
    setStatus: (status) => set({ status }),
    clear: () => set({ token: null, role: null, userId: null }),
  }));

export type AuthStore = ReturnType<typeof createAuthStore>;

export const authStore = createAuthStore();

export function useAuthStore<T>(selector: (state: AuthStoreState) => T): T {
  return useStore(authStore, selector);
}
