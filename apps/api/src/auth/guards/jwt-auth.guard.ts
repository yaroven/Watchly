import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { UserResponseDto } from "../../user/dto/response/user-response.dto";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = UserResponseDto>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const validatedUser = super.handleRequest(err, user, info, context, status);

    const request = context.switchToHttp().getRequest<Request>();
    request.viewerScope = "required";
    request.userId = (validatedUser as unknown as UserResponseDto).id;
    request.role = (validatedUser as UserResponseDto).role;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return validatedUser;
  }
}
