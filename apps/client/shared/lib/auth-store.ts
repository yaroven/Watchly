import Role from "@/types/role";
import { createStore, useStore } from "zustand";

/**
 * "idle"/"loading" cover the brief window on app boot where the httpOnly refresh cookie is
 * being exchanged for a session (see restoreSession in shared/api/axios.ts) — role-gated
 * views must wait for "resolved" before deciding anything, since the store starts empty on
 * every hard navigation regardless of whether the user is actually logged in.
 */
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
    // Initial state
    token: null,
    role: null,
    userId: null,
    status: "idle",

    // Actions
    setSession: ({ token, role, userId }) => set({ token, role, userId }),
    setToken: (token) => set({ token }),
    setRole: (role) => set({ role }),
    setUserId: (userId) => set({ userId }),
    setStatus: (status) => set({ status }),
    // Session status (bootstrapped or not) survives logout — only the identity resets.
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
