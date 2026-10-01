import Role from "@/types/role";

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

/**
 * Whether the access token should be refreshed before it is sent.
 *
 * "Unreadable" counts as expired. The caller cannot fall back on the server
 * noticing: `@OptionalAuth()` routes answer 200-anonymous to a dead token rather
 * than 401, so nothing downstream would ever trigger a refresh and the viewer's
 * own likes and watchlist would read as unknown for as long as that token sits
 * in the store. Refreshing a token that was in fact fine costs one round trip;
 * the caller guards against a wrong clock turning that into every round trip.
 */
export function isAccessTokenExpired(token: string, skewSeconds = 10): boolean {
  const exp = readPayload(token)?.exp;
  if (typeof exp !== "number") {
    console.warn("[auth] Access token carries no readable `exp`; treating it as expired");
    return true;
  }
  return Date.now() >= (exp - skewSeconds) * 1000;
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
