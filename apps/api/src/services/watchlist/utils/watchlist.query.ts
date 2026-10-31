import { Prisma } from "@prisma/client";

const watchlistQuery = {
  forViewer: (userId: string) =>
    ({ userId, title: { is: {} } }) satisfies Prisma.WatchlistItemWhereInput,

  titleIds: (userId: string, { page = 1, limit = 10 }: { page?: number; limit?: number }) =>
    ({
      where: watchlistQuery.forViewer(userId),
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { titleId: true },
    }) satisfies Prisma.WatchlistItemFindManyArgs,
};

export default watchlistQuery;
