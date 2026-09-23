import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { UserResponseDto } from "../../user/dto/response/user-response.dto";

/**
 * Runs the "jwt" Passport strategy (via `AuthGuard`) and additionally attaches the resolved
 * user's id directly onto `request.userId`, so anything downstream can read it without
 * reaching into `request.user`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = UserResponseDto>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    // @nestjs/passport's own `handleRequest` is typed `any` regardless of `TUser` — an
    // unavoidable boundary. Throws UnauthorizedException when the strategy rejected the request.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const validatedUser = super.handleRequest(err, user, info, context, status);

    const request = context.switchToHttp().getRequest<Request>();
    request.userId = (validatedUser as unknown as UserResponseDto).id;
    request.role = (validatedUser as UserResponseDto).role;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return validatedUser;
  }
}
