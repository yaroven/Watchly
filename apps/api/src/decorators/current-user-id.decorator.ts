import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import type { Request } from "express";

const logger = new Logger("CurrentUserId");

export function readCurrentUserId(context: ExecutionContext): string {
  const request = context.switchToHttp().getRequest<Request>();
  if (!request.userId) {
    logger.error(
      request.viewerScope === "optional"
        ? `@CurrentUserId() on the @OptionalAuth() route ${request.method} ${request.url} — anonymous callers cannot satisfy it; use @OptionalUserId()`
        : `No viewer on the request at ${request.method} ${request.url} — is the route missing @Auth()?`,
    );
    throw new InternalServerErrorException();
  }
  return request.userId;
}

export function readOptionalUserId(context: ExecutionContext): string | undefined {
  return context.switchToHttp().getRequest<Request>().userId;
}

export const currentUserIdFactory = (_data: unknown, context: ExecutionContext): string =>
  readCurrentUserId(context);

export const optionalUserIdFactory = (
  _data: unknown,
  context: ExecutionContext,
): string | undefined => readOptionalUserId(context);

export const CurrentUserId = createParamDecorator(currentUserIdFactory);

export const OptionalUserId = createParamDecorator(optionalUserIdFactory);
