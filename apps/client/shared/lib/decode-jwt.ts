import Role from "@/types/role";
import { serverNow } from "./server-time";

export interface AccessTokenClaims {
  userId: string;
  role: Role;
}

function readPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json: unknown = JSON.parse(atob(base64));
    return typeof json === "object" && json !== null ? (json as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(token: string, skewSeconds = 10): boolean {
  const exp = readPayload(token)?.exp;
  if (typeof exp !== "number") {
    console.warn("[auth] Access token carries no readable `exp`; treating it as expired");
    return true;
  }
  return serverNow() >= (exp - skewSeconds) * 1000;
}

export function decodeAccessToken(token: string): AccessTokenClaims | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json: unknown = JSON.parse(atob(base64));

    if (
      typeof json !== "object" ||
      json === null ||
      !("userId" in json) ||
      !("role" in json) ||
      typeof json.userId !== "string" ||
      typeof json.role !== "string" ||
      !Object.values(Role).includes(json.role as Role)
    ) {
      return null;
    }

    return { userId: json.userId, role: json.role as Role };
  } catch {
    return null;
  }
}
