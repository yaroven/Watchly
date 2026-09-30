import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { UserResponseDto } from "../../user/dto/response/user-response.dto";

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = UserResponseDto>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) return undefined as TUser;

    const request = context.switchToHttp().getRequest<Request>();
    const authenticated = user as unknown as UserResponseDto;
    request.userId = authenticated.id;
    request.role = authenticated.role;

    return user;
  }
}
