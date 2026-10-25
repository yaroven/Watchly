export class RedisUnavailableError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`Redis is unavailable (${operation})`);
    this.name = RedisUnavailableError.name;
    this.cause = cause;
  }
}

export async function throughRedis<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw new RedisUnavailableError(operation, error);
  }
}
