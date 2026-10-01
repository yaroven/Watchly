import { ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { UserResponseDto } from "../../user/dto/response/user-response.dto";

/**
 * For reads that are public but richer when the caller is known.
 *
 * Nothing here is ever a 401 — not a rejected credential, and not a failure
 * inside the strategy. These routes serve pages that need no session, and the
 * client turns a 401 into refresh-then-redirect-to-login, so 401-ing one would
 * eject a viewer with a dead refresh cookie off a page they were entitled to
 * see. The cost is that a strategy failure degrades every signed-in read to
 * anonymous, which is why the two cases are logged apart and at different
 * severities: one expired token is routine, an outage in the user lookup is not.
 *
 * This leaves nothing to tell a client its access token has gone stale, since the
 * response is a normal 200. `apps/client/shared/api/axios.ts` refreshes an expired
 * token before sending it for that reason; if that ever stops being true, signed-in
 * viewers will silently read as anonymous here.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);

  handleRequest<TUser = UserResponseDto>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest<Request>();
    // Stamped before the branches below, because all three of them are this
    // guard answering "there may or may not be a viewer" — including the two
    // that leave `userId` unset.
    request.viewerScope = "optional";

    if (err) {
      // The strategy itself failed — e.g. the user lookup it runs on every
      // request. Every signed-in caller is being served anonymous data right now.
      this.logger.error(
        `Authentication failed on optional route ${request.method} ${request.url}; serving it anonymously`,
        err instanceof Error ? err.stack : describeInfo(err),
      );
      return undefined as TUser;
    }

    if (!user) {
      if (request.headers.authorization) {
        this.logger.warn(
          `Rejected credential on ${request.method} ${request.url}, continuing anonymously: ${describeInfo(info)}`,
        );
      }
      return undefined as TUser;
    }

    const authenticated = user as unknown as UserResponseDto;
    request.userId = authenticated.id;
    request.role = authenticated.role;

    return user;
  }
}

function describeInfo(info: unknown): string {
  if (info instanceof Error) return `${info.name}: ${info.message}`;
  if (info && typeof info === "object" && "message" in info) {
    return String(info.message);
  }
  return "no reason given";
}
