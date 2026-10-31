import { Prisma } from "@prisma/client";

const titleCastQuery = {
  forTitle: (titleId: string) =>
    ({
      where: { titleId },
      include: { artist: true },
      orderBy: { order: "asc" },
    }) satisfies Prisma.CastCreditFindManyArgs,
};

export default titleCastQuery;
