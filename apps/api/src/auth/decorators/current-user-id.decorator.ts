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
    // Nest's default filter does not log HttpExceptions, and both of these mean a
    // route is wired wrong — the kind of thing that must not be silent.
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

/**
 * Named and exported so `viewer-pairing.spec.ts` can tell the two decorators
 * apart in route metadata — Nest stores the factory it was given by reference,
 * and an inline arrow is indistinguishable from the outside. Pure functions, so
 * exporting them adds no reachable state.
 */
export const currentUserIdFactory = (_data: unknown, context: ExecutionContext): string =>
  readCurrentUserId(context);

export const optionalUserIdFactory = (
  _data: unknown,
  context: ExecutionContext,
): string | undefined => readOptionalUserId(context);

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
export const CurrentUserId = createParamDecorator(currentUserIdFactory);

/** The viewer's id where there may be none — routes behind `@OptionalAuth()`. */
export const OptionalUserId = createParamDecorator(optionalUserIdFactory);
