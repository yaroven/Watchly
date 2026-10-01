import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from "@nestjs/common";
import type { Request } from "express";

/**
 * The signed-in viewer's id, for routes behind `@Auth()`.
 *
 * Typed `string`, so services take `string` and no call site needs `userId!`.
 * Past the guard an unset viewer is our own plumbing broken, not a credential
 * problem — reporting it as 401 would send the client into refresh-then-sign-out
 * for a server bug. It is also what keeps `undefined` out of a Prisma `where`,
 * where it reads as "no filter" and widens one person's delete to everyone's.
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const { userId } = context.switchToHttp().getRequest<Request>();
    if (!userId) {
      throw new InternalServerErrorException(
        "Authenticated route reached with no viewer on the request",
      );
    }
    return userId;
  },
);

/** The viewer's id where there may be none — routes behind `@OptionalAuth()`. */
export const OptionalUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | undefined =>
    context.switchToHttp().getRequest<Request>().userId,
);
