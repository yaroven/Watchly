import { applyDecorators, UseGuards } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";

export const ROLES_KEY = Reflector.createDecorator<Role[]>();

export const Roles = (roles: Role[]) =>
  applyDecorators(ROLES_KEY(roles), UseGuards(JwtAuthGuard, RolesGuard));

export const AdminOnly = () => Roles([Role.ADMIN]);
