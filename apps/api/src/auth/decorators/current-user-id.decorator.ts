import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import type { Request } from "express";

const logger = new Logger("CurrentUserId");

/**
 * Exported so the rule can be tested directly — Nest never invokes a param
 * decorator on a plain method call, so a controller spec cannot reach it.
 */
export function readCurrentUserId(context: ExecutionContext): string {
  const request = context.switchToHttp().getRequest<Request>();
  if (!request.userId) {
    // Nest's default filter does not log HttpExceptions, and this one means a
    // guard is missing from a route — the kind of thing that must not be silent.
    logger.error(
      `No viewer on the request at ${request.method} ${request.url} — is the route missing @Auth()?`,
    );
    throw new InternalServerErrorException();
  }
  return request.userId;
}

export function readOptionalUserId(context: ExecutionContext): string | undefined {
  return context.switchToHttp().getRequest<Request>().userId;
}

/**
 * The signed-in viewer's id, for routes behind `@Auth()`.
 *
 * Typed `string`, so services take `string` and no call site needs `userId!`.
 * Past the guard an unset viewer is our own plumbing broken, not a credential
 * problem — reporting it as 401 would send the client into refresh-then-sign-out
 * for a server bug. It is also what keeps `undefined` out of a Prisma `where`,
 * where it reads as "no filter" and widens one person's delete to everyone's.
 *
 * Pair it with `@Auth()` or `@AdminOnly()` only. On an `@OptionalAuth()` route it
 * turns every anonymous caller into a 500; use `@OptionalUserId()` there.
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => readCurrentUserId(context),
);

/** The viewer's id where there may be none — routes behind `@OptionalAuth()`. */
export const OptionalUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | undefined => readOptionalUserId(context),
);
