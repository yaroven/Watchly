interface PaginatableDelegate {
  findMany(args: any): Promise<any>;
  count(args: any): Promise<number>;
}

interface PaginateArgs<TWhere, TOrderBy, TExtra> {
  where?: TWhere;
  orderBy?: TOrderBy;
  page?: number;
  limit?: number;
  extra?: TExtra;
}

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
