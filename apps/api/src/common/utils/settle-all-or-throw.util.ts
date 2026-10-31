import { InternalServerErrorException } from "@nestjs/common";
import pSettle from "p-settle";

export interface SettleAllOrThrowContext {
  itemLabel: string;
  parentLabel: string;
  parentId: string;
}

const DEFAULT_CONCURRENCY = 8;

export async function settleAllOrThrow<T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
  getId: (item: T) => string,
  context: SettleAllOrThrowContext,
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<void> {
  const results = await pSettle(
    items.map((item) => () => fn(item)),
    { concurrency },
  );

  const failedIds = results.flatMap((result, index) =>
    result.isRejected ? [getId(items[index])] : [],
  );

  if (failedIds.length === 0) return;

  throw new InternalServerErrorException(
    `Failed to clean up ${failedIds.length} of ${items.length} ${context.itemLabel}s for ${context.parentLabel} ${context.parentId}: ${failedIds.join(", ")}`,
  );
}

export async function settleAll<T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<void> {
  await pSettle(
    items.map((item) => () => fn(item)),
    { concurrency },
  );
}
