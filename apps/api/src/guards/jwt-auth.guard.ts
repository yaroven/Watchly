import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { UserView } from "../services/user/user.types";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = UserView>(
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
    request.userId = (validatedUser as unknown as UserView).id;
    request.role = (validatedUser as UserView).role;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return validatedUser;
  }
}
