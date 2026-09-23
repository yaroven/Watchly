import Role from "@/types/role";

export interface AccessTokenClaims {
  userId: string;
  role: Role;
}

/**
 * Decodes the access token's payload — no signature verification, none is possible client-side.
 * For UI/session state only (who am I, what role do I render as); every actual authorization
 * decision is re-checked server-side by the API's @Auth() guard on every request.
 */
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
