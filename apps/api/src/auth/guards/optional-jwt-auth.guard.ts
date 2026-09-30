import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { UserResponseDto } from "../../user/dto/response/user-response.dto";

/**
 * For routes anyone may call, where a signed-in caller gets more back — their
 * own score on a title, their own reaction on a comment. Same strategy as
 * JwtAuthGuard, but a missing or invalid token leaves `request.userId`
 * undefined instead of rejecting the request.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = UserResponseDto>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    // Deliberately not calling super.handleRequest: its whole job is to throw
    // when the strategy found nobody, which is the case this guard exists to
    // allow.
    if (err || !user) return undefined as TUser;

    const request = context.switchToHttp().getRequest<Request>();
    const authenticated = user as unknown as UserResponseDto;
    request.userId = authenticated.id;
    request.role = authenticated.role;

    return user;
  }
}
