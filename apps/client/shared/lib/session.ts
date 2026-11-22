import Role from "@/types/role";
import { authStore } from "./auth-store";
import { decodeAccessToken } from "./decode-jwt";

export interface AuthResponse {
  accessToken: string;
  userId?: string;
  role?: Role | string;
}

export interface Identity {
  userId: string;
  role: Role;
}

const isRole = (value: unknown): value is Role => typeof value === "string" && (Object.values(Role) as string[]).includes(value);

export function identityFrom(body: AuthResponse): Identity | null {
  const fromToken = decodeAccessToken(body.accessToken);
  if (!body.userId) return fromToken;
  if (isRole(body.role)) return { userId: body.userId, role: body.role };
  return fromToken?.userId === body.userId ? fromToken : null;
}

export function startSession(body: AuthResponse): Identity | null {
  const identity = identityFrom(body);
  if (identity) authStore.getState().setSession({ token: body.accessToken, ...identity });
  return identity;
}
