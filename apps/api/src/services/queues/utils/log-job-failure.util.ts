import { Logger } from "@nestjs/common";

export default function logJobFailure(logger: Logger, context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);

  logger.error(`${context} failed: ${message}`, error instanceof Error ? error.stack : undefined);
}
