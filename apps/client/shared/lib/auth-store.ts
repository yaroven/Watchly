import Role from "@/types/role";
import { createStore, useStore } from "zustand";

export interface AuthStoreState {
  token: string | null;
  role: Role | null;
  userId: string | null;
  setSession: (session: { token: string; role: Role; userId: string }) => void;
  setToken: (token: string | null) => void;
  setRole: (role: Role | null) => void;
  setUserId: (userId: string | null) => void;
  clear: () => void;
}

export const createAuthStore = () =>
  createStore<AuthStoreState>((set) => ({
    // Initial state
    token: null,
    role: null,
    userId: null,

    // Actions
    setSession: ({ token, role, userId }) => set({ token, role, userId }),
    setToken: (token) => set({ token }),
    setRole: (role) => set({ role }),
    setUserId: (userId) => set({ userId }),
    clear: () => set({ token: null, role: null, userId: null }),
  }));

export type AuthStore = ReturnType<typeof createAuthStore>;

/**
 * Single shared instance. Code outside React (the axios interceptors in shared/api) reads/
 * writes it directly via `authStore.getState()` / `authStore.setState(...)` — components use
 * the `useAuthStore` hook below instead, so both stay in sync off the same store.
 *
 * Lives in shared/, not features/auth/, because shared/ (axios) needs it and shared/ must
 * never import from features/ — see the watchly/layer-boundaries eslint rule.
 */
export const authStore = createAuthStore();

/** React binding: `const token = useAuthStore((s) => s.token);` */
export function useAuthStore<T>(selector: (state: AuthStoreState) => T): T {
  return useStore(authStore, selector);
}
