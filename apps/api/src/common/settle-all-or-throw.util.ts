import { InternalServerErrorException, Logger } from "@nestjs/common";
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
  logger: Logger,
  context: SettleAllOrThrowContext,
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<void> {
  const results = await pSettle(
    items.map((item) => () => fn(item)),
    { concurrency },
  );

  const failed = results
    .map((result, index) => ({ result, id: getId(items[index]) }))
    .filter(
      (entry): entry is { result: pSettle.PromiseRejectedResult; id: string } =>
        entry.result.isRejected,
    );

  if (failed.length === 0) return;

  for (const { id, result } of failed) {
    logger.error(
      `Failed to clean up ${context.itemLabel} ${id} while deleting ${context.parentLabel} ${context.parentId}`,
      result.reason,
    );
  }

  throw new InternalServerErrorException(
    `Failed to clean up ${failed.length} of ${items.length} ${context.itemLabel}s for ${context.parentLabel} ${context.parentId}: ${failed
      .map((f) => f.id)
      .join(", ")}`,
  );
}

/**
 * Same as settleAllOrThrow, but never throws — used for best-effort cleanup that
 * runs after the owning DB row is already committed as deleted, so a storage/queue
 * failure here must not be reported back as a failed delete.
 */
export async function settleAllOrLog<T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
  getId: (item: T) => string,
  logger: Logger,
  context: SettleAllOrThrowContext,
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<void> {
  const results = await pSettle(
    items.map((item) => () => fn(item)),
    { concurrency },
  );

  results.forEach((result, index) => {
    if (result.isRejected) {
      logger.error(
        `Failed to clean up ${context.itemLabel} ${getId(items[index])} after deleting ${context.parentLabel} ${context.parentId}`,
        result.reason,
      );
    }
  });
}
