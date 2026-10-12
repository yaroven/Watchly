import { Prisma } from "@prisma/client";

/**
 * `titleIds` is the page: both the rows and the count go through the same
 * `where`, so they agree with each other. `title: { is: {} }` drops rows whose
 * title is gone — counting rows the page cannot render makes the pager advertise
 * pages that come back short.
 */
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
