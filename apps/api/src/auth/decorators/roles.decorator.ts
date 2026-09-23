import { applyDecorators, UseGuards } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";

/** Reflector metadata key — read by RolesGuard, not meant to be used directly on a route. */
export const ROLES_KEY = Reflector.createDecorator<Role[]>();

/**
 * Requires a signed-in user whose role is one of `roles`. Self-sufficient — runs the JWT
 * strategy itself, so don't also stack `@Auth()` on the same route.
 */
export const Roles = (roles: Role[]) =>
  applyDecorators(ROLES_KEY(roles), UseGuards(JwtAuthGuard, RolesGuard));
