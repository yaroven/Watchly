import { ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { UserResponseDto } from "../../user/dto/response/user-response.dto";

/**
 * For reads that are public but richer when the caller is known.
 *
 * A rejected credential answers anonymously rather than 401. These routes serve
 * pages that need no session, and the client turns a 401 into refresh-then-
 * redirect-to-login — so 401-ing a public read ejects a viewer with a dead
 * refresh cookie off a page they were entitled to see. Keeping the access token
 * fresh is the client's job (it refreshes before sending an expired one); the
 * rejection is logged here so a sudden anonymous-read spike is diagnosable.
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
    if (err || !user) {
      const request = context.switchToHttp().getRequest<Request>();
      if (request.headers.authorization) {
        this.logger.warn(
          `Rejected credential on an optional route, continuing anonymously: ${describe(err ?? info)}`,
        );
      }
      return undefined as TUser;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authenticated = user as unknown as UserResponseDto;
    request.userId = authenticated.id;
    request.role = authenticated.role;

    return user;
  }
}

function describe(reason: unknown): string {
  if (reason instanceof Error) return `${reason.name}: ${reason.message}`;
  if (reason && typeof reason === "object" && "message" in reason) {
    return String(reason.message);
  }
  return "no reason given";
}
