import { applyDecorators, UseGuards } from "@nestjs/common";
import { OptionalJwtAuthGuard } from "../guards/optional-jwt-auth.guard";

/**
 * Public route that still reads the caller when a token is present — sets
 * `request.userId` for signed-in callers and leaves it undefined for everyone
 * else, rather than turning anonymous access into a 401.
 */
export const OptionalAuth = () => applyDecorators(UseGuards(OptionalJwtAuthGuard));
