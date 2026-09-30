import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
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
    const request = context.switchToHttp().getRequest<Request>();

    if (err || !user) {
      // Optional means "a caller may be anonymous", not "any credential may be
      // wrong". A presented-but-rejected token has to stay a 401, or an expired
      // access token reads as a signed-out viewer: the response carries someone
      // else's defaults and the client's refresh-and-retry never fires.
      if (request.headers.authorization) {
        throw err instanceof Error ? err : new UnauthorizedException();
      }
      return undefined as TUser;
    }

    const authenticated = user as unknown as UserResponseDto;
    request.userId = authenticated.id;
    request.role = authenticated.role;

    return user;
  }
}
