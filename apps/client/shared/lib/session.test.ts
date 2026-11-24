import Role from "@/types/role";
import { describe, expect, it } from "vitest";
import { identityFrom } from "./session";

const token = (claims: object) => `h.${btoa(JSON.stringify(claims))}.s`;

describe("identityFrom", () => {
  it("takes the identity the response body states", () => {
    expect(identityFrom({ accessToken: token({ userId: "u1", role: Role.USER }), userId: "u2", role: Role.ADMIN })).toEqual({
      userId: "u2",
      role: Role.ADMIN,
    });
  });

  it("falls back to the token when the body names no user or an unknown role for the same user", () => {
    const accessToken = token({ userId: "u1", role: Role.USER });
    expect(identityFrom({ accessToken })).toEqual({ userId: "u1", role: Role.USER });
    expect(identityFrom({ accessToken, userId: "u1", role: "superuser" })).toEqual({ userId: "u1", role: Role.USER });
  });

  it("refuses when body and token disagree about who the viewer is", () => {
    expect(identityFrom({ accessToken: token({ userId: "u1", role: Role.USER }), userId: "u2", role: "superuser" })).toBeNull();
  });
});
