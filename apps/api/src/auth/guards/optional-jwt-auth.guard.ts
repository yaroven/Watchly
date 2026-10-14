import { ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { UserResponseDto } from "../../user/dto/response/user-response.dto";

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
    request.viewerScope = "optional";

    if (err) {
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
