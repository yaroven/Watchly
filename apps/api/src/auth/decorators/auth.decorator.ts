import { applyDecorators, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";

/** Requires a valid `Authorization: Bearer <token>` on the route — runs the JWT strategy and sets `request.userId`. */
export const Auth = () => applyDecorators(UseGuards(JwtAuthGuard));
