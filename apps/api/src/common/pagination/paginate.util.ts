interface PaginatableDelegate {
  findMany(args: any): Promise<any>;
  count(args: any): Promise<number>;
}

interface PaginateArgs<TWhere, TOrderBy, TExtra> {
  where?: TWhere;
  orderBy?: TOrderBy;
  page?: number;
  limit?: number;
  /** Extra `findMany` args a resource needs beyond where/orderBy/skip/take — e.g. `{ include: {...} }`. */
  extra?: TExtra;
}

/**
 * Runs the `findMany`/`count` pair every paginated `findAll` needs, with the page/limit math done once.
 * `TResult` is explicit (not inferred from the delegate) so a resource whose `extra.include` widens the
 * row shape — e.g. Title's `{ include: { genres: true } }` — gets that shape back, not the delegate's
 * bare default. Same escape hatch this codebase already uses for `buildWhere`/`buildOrderBy`'s
 * `as Prisma.XWhereInput` casts: Prisma's generated delegate types are too precisely overloaded to
 * thread through a generic wrapper, so the caller asserts the shape it knows `extra` will produce.
 */
export async function paginate<
  TResult,
  TWhere = unknown,
  TOrderBy = unknown,
  TExtra extends object = object,
>(
  delegate: PaginatableDelegate,
  { where, orderBy, page = 1, limit = 10, extra }: PaginateArgs<TWhere, TOrderBy, TExtra>,
): Promise<{ items: TResult[]; totalCount: number }> {
  const [items, totalCount] = await Promise.all([
    delegate.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      ...extra,
    }) as Promise<TResult[]>,
    delegate.count({ where }),
  ]);

  return { items, totalCount };
}
