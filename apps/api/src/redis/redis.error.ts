/**
 * Redis was unreachable for one command.
 *
 * A type of its own because the write path answers 503 for it and 500 for
 * everything else: a vote that cannot be cached is a dependency being down,
 * while a failed row read is a bug. Matching on an ioredis message string
 * would be the alternative, and that string is not ours.
 */
export class RedisUnavailableError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`Redis is unavailable (${operation})`);
    this.name = RedisUnavailableError.name;
    this.cause = cause;
  }
}

/** Runs a Redis command, naming the failure as ours rather than ioredis's. */
export async function throughRedis<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw new RedisUnavailableError(operation, error);
  }
}
