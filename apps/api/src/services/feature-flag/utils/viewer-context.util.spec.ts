import { Role } from "@prisma/client";
import { viewerContextOf } from "./viewer-context.util";

describe("viewerContextOf", () => {
  it("should carry no targeting key for an anonymous viewer", () => {
    expect(viewerContextOf({})).toEqual({});
  });

  it("should key a signed-in viewer by id and carry their role", () => {
    expect(viewerContextOf({ userId: "u1", role: Role.ADMIN })).toEqual({
      targetingKey: "u1",
      role: Role.ADMIN,
    });
  });
});
